import { AtendimentoSacService } from '../atendimento-sac/atendimento-sac.service';
import {
  BadRequestException,
  ForbiddenException,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import request from 'supertest';
import { PrismaService } from '../../prisma/prisma.service';
import { EntradasService } from './entradas.service';
import { TicketsService } from '../tickets/tickets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RelatosSiteController } from './relatos-site.controller';
import { RelatosSiteService } from './relatos-site.service';
import { RegistrarRelatoDto } from './dto/registrar-relato.dto';

describe('Relatos do site como atendimento', () => {
  let diretorio: string;
  let app: INestApplication;
  let service: RelatosSiteService;
  const sac = {
    receberTicket: jest
      .fn()
      .mockResolvedValue({ sucesso: true, protocolo: 'SAC-2026-000001' }),
  };
  const entradas = { createFromSite: jest.fn() };
  const tickets = { findOne: jest.fn() };
  const prisma = { ticket: { findFirst: jest.fn() } };
  const dto = (): RegistrarRelatoDto => ({
    identificador: randomUUID(),
    nome: 'Pessoa Teste',
    telefone: '41999999999',
    email: 'teste@example.invalid',
    estado: 'PR',
    tipo: 'RECLAMACAO',
    relato: 'Relato de teste com detalhes.',
  });
  const pdf = (): Express.Multer.File =>
    ({
      originalname: 'documento.pdf',
      mimetype: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n%%EOF'),
      size: 14,
    }) as Express.Multer.File;
  beforeAll(async () => {
    diretorio = await mkdtemp(join(tmpdir(), 'relatos-site-teste-'));
    const modulo = await Test.createTestingModule({
      controllers: [RelatosSiteController],
      providers: [
        RelatosSiteService,
        { provide: AtendimentoSacService, useValue: sac },
        { provide: EntradasService, useValue: entradas },
        { provide: TicketsService, useValue: tickets },
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: new ConfigService({
            SITE_LEAD_INTEGRATION_TOKEN: 'token-servidor',
            RELATOS_SITE_UPLOAD_DIR: diretorio,
          }),
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: () => {
          throw new ForbiddenException();
        },
      })
      .compile();
    service = modulo.get(RelatosSiteService);
    app = modulo.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });
  afterAll(async () => {
    await app.close();
    if (
      !resolve(diretorio).startsWith(resolve(tmpdir()) + '\\') &&
      !resolve(diretorio).startsWith(resolve(tmpdir()) + '/')
    )
      throw new Error('Unsafe temp path');
    await rm(diretorio, { recursive: true, force: true });
  });
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.ticket.findFirst.mockResolvedValue(null);
    entradas.createFromSite.mockResolvedValue({
      id: 'ticket-origem',
      protocolo: 'SAC-2026-000001',
    });
  });
  it('cria atendimento SUPORTE, preserva campos e mantém os anexos privados', async () => {
    const dados = dto();
    expect(await service.registrar(dados, [pdf()])).toEqual({
      sucesso: true,
      protocolo: 'SAC-2026-000001',
    });
    const [payload, destino] = entradas.createFromSite.mock.calls[0];
    expect(destino).toBe('sac');
    expect(payload).toMatchObject({
      tipo: 'SUPORTE',
      nomeSolicitante: dados.nome,
      emailSolicitante: dados.email,
      telefoneSolicitante: dados.telefone,
      formPayload: {
        estado: 'PR',
        tipoRegistro: 'RECLAMACAO',
        relato: dados.relato,
      },
    });
    expect(payload.formPayload.anexos[0].nome).toBe('documento.pdf');
    expect(
      JSON.stringify(
        await service.registrar({ ...dados, identificador: randomUUID() }),
      ),
    ).not.toMatch(/arquivo|token|email/);
    expect(await readdir(diretorio)).toContain(
      payload.formPayload.anexos[0].arquivo,
    );
  });
  it('mantém cada comentário associado ao respectivo arquivo', async () => {
    await service.registrar(
      {
        ...dto(),
        comentariosAnexos: [' Foto da embalagem ', 'Comprovante da entrega'],
      },
      [
        { ...pdf(), originalname: 'embalagem.pdf' },
        { ...pdf(), originalname: 'entrega.pdf' },
      ],
    );
    const anexos = entradas.createFromSite.mock.calls[0][0].formPayload.anexos;
    expect(anexos).toMatchObject([
      { nome: 'embalagem.pdf', comentario: 'Foto da embalagem' },
      { nome: 'entrega.pdf', comentario: 'Comprovante da entrega' },
    ]);
  });
  it('rejeita comentários inválidos ou sem arquivo correspondente', async () => {
    for (const comentariosAnexos of [
      ['comentário sem anexo'],
      ['x'.repeat(1001)],
      [123] as unknown as string[],
    ]) {
      await expect(
        service.registrar({ ...dto(), comentariosAnexos }),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(entradas.createFromSite).not.toHaveBeenCalled();
  });
  it('multipart recebe comentários e arquivos juntos e valida o array', async () => {
    const envio = request(app.getHttpServer())
      .post('/api/atendimentos/site/relatos')
      .set('x-integration-token', 'token-servidor');
    Object.entries(dto()).forEach(([campo, valor]) =>
      envio.field(campo, valor),
    );
    await envio
      .field('comentariosAnexos', JSON.stringify(['Primeiro', 'Segundo']))
      .attach('arquivos', pdf().buffer, {
        filename: 'primeiro.pdf',
        contentType: 'application/pdf',
      })
      .attach('arquivos', pdf().buffer, {
        filename: 'segundo.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    expect(
      entradas.createFromSite.mock.calls[0][0].formPayload.anexos,
    ).toMatchObject([{ comentario: 'Primeiro' }, { comentario: 'Segundo' }]);
    const invalido = request(app.getHttpServer())
      .post('/api/atendimentos/site/relatos')
      .set('x-integration-token', 'token-servidor');
    Object.entries(dto()).forEach(([campo, valor]) =>
      invalido.field(campo, valor),
    );
    await invalido.field('comentariosAnexos', '{invalido').expect(400);
  });
  it('não duplica registro em reenvio ou envio simultâneo', async () => {
    const dados = dto();
    await Promise.all([service.registrar(dados), service.registrar(dados)]);
    expect(entradas.createFromSite).toHaveBeenCalledTimes(1);
    const formPayload = entradas.createFromSite.mock.calls[0][0].formPayload;
    prisma.ticket.findFirst.mockResolvedValue({
      id: 'ticket-origem',
      protocolo: 'SAC-2026-000001',
      formPayload,
    });
    expect(await service.registrar(dados)).toMatchObject({
      protocolo: 'SAC-2026-000001',
    });
    await expect(
      service.registrar({ ...dados, relato: 'Outro relato diferente.' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(entradas.createFromSite).toHaveBeenCalledTimes(1);
  });
  it('rejeita arquivo disfarçado, extensão não suportada e mais de 5 anexos', async () => {
    await expect(
      service.registrar(dto(), [{ ...pdf(), buffer: Buffer.from('<script>') }]),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.registrar(dto(), [
        { ...pdf(), mimetype: 'application/x-msdownload' },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.registrar(dto(), Array.from({ length: 6 }, pdf)),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(entradas.createFromSite).not.toHaveBeenCalled();
  });
  it('remove arquivos se o atendimento não foi gravado', async () => {
    const antes = await readdir(diretorio);
    entradas.createFromSite.mockRejectedValueOnce(new Error('Falha banco'));
    await expect(service.registrar(dto(), [pdf()])).rejects.toThrow(
      'Falha banco',
    );
    expect(await readdir(diretorio)).toEqual(antes);
  });
  it('não duplica um atendimento persistido se apenas a notificação falhar', async () => {
    prisma.ticket.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'ticket-origem',
        protocolo: 'SAC-2026-000001',
      });
    entradas.createFromSite.mockRejectedValueOnce(
      new Error('Falha notificação'),
    );
    expect(await service.registrar(dto())).toEqual({
      sucesso: true,
      protocolo: 'SAC-2026-000001',
    });
  });
  it('download reutiliza autorização do ticket e bloqueia caminho inválido', async () => {
    tickets.findOne.mockRejectedValueOnce(new ForbiddenException());
    await expect(
      service.baixar(
        { sub: 'cliente', role: 'CLIENTE' },
        randomUUID(),
        randomUUID(),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    const anexoId = randomUUID();
    tickets.findOne.mockResolvedValue({
      formPayload: {
        canal: 'RECLAMACOES_ELOGIOS',
        anexos: [{ id: anexoId, arquivo: '../segredo', nome: 'x' }],
      },
    });
    await expect(
      service.baixar({ sub: 'admin', role: 'ADMIN' }, randomUUID(), anexoId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
  it('endpoint exige token servidor, valida formulário e download exige JWT', async () => {
    await request(app.getHttpServer())
      .post('/api/atendimentos/site/relatos')
      .field('nome', 'Pessoa')
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/atendimentos/site/relatos')
      .set('x-integration-token', 'token-servidor')
      .field('nome', 'Pessoa')
      .expect(400);
    await request(app.getHttpServer())
      .get(
        `/api/atendimentos/site/relatos/${randomUUID()}/anexos/${randomUUID()}`,
      )
      .expect(403);
  });
  it('endpoint multipart normaliza campos e retorna só confirmação e protocolo', async () => {
    const envio = request(app.getHttpServer())
      .post('/api/atendimentos/site/relatos')
      .set('x-integration-token', 'token-servidor');
    Object.entries({
      ...dto(),
      email: ' TESTE@EXAMPLE.INVALID ',
      telefone: '(41) 99999-9999',
    }).forEach(([campo, valor]) => envio.field(campo, valor));
    const resposta = await envio
      .attach('arquivos', pdf().buffer, {
        filename: 'documento.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    expect(resposta.body).toEqual({
      sucesso: true,
      protocolo: 'SAC-2026-000001',
    });
    expect(entradas.createFromSite.mock.calls[0][0]).toMatchObject({
      emailSolicitante: 'teste@example.invalid',
      telefoneSolicitante: '41999999999',
    });
  });
});
