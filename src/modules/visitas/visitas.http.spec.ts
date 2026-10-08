import { ExecutionContext, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ConfigService } from '@nestjs/config';
import { VisitasController } from './visitas.controller';
import { VisitasService } from './visitas.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AtendimentoSacService } from '../atendimento-sac/atendimento-sac.service';
import { UsuarioSacGuard } from '../atendimento-sac/usuario-sac.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('API Visitas — DTOs e autorização no servidor', () => {
  let app: any;
  let perfil = 'ATENDIMENTO',
    ativo = true;
  let visita: any;
  const id = 'b2325b25-2ba0-46aa-a562-9a8ccad3afff';
  const autor = 'a1225b25-2ba0-46aa-a562-9a8ccad3afff';
  const prisma: any = {
    user: {
      findUnique: async () => ({
        role: perfil,
        roles: [perfil],
        id: autor,
        isActive: ativo,
      }),
    },
    visitaCliente: {
      create: async ({ data }: any) => { visita = { ...visita, numero: 1, ...data }; return visita; },
      findUniqueOrThrow: async () => ({ ...visita }),
      findUnique: async () => ({ ...visita }),
      update: async ({ data }: any) => {
        visita = { ...visita, ...data };
        return visita;
      },
    },
    visitaHistorico: { create: async ({ data }: any) => data },
    visitaRealizacao: { create: async ({ data }: any) => data },
    $transaction: async (run: any) => run(prisma),
  };
  const dados = {
    dataRealizada: new Date(Date.now() - 3600000).toISOString(),
    relato: 'Visita registrada.',
    pessoaAtendeu: 'Maria',
    teveCusto: false,
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [VisitasController],
      providers: [
        VisitasService,
        UsuarioSacGuard,
        { provide: PrismaService, useValue: prisma },
        { provide: AtendimentoSacService, useValue: {} },
        { provide: ConfigService, useValue: new ConfigService() },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(ctx: ExecutionContext) {
          const req = ctx.switchToHttp().getRequest();
          // JWT de teste anuncia ADMIN; guard real deve usar os perfis atuais do banco.
          req.user = {
            sub: req.headers['x-test-user'] || autor,
            role: 'ADMIN',
          };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });
  afterAll(async () => app.close());
  beforeEach(() => {
    perfil = 'ATENDIMENTO';
    ativo = true;
    visita = {
      id,
      status: 'AGUARDANDO_REALIZACAO',
      responsavelId: autor,
      dataPrevista: new Date(),
    };
  });
  it('cria visita sem cliente cadastrado e rejeita nome vazio', async () => {
    perfil = 'GESTAO';
    const cadastro = {
      clienteNome: '  Empresa livre  ', cnpj: '12.345.678/0001-90',
      responsavelId: autor, localVisita: 'Local livre', tipoVisita: 'Relacionamento',
      dataPrevista: new Date().toISOString(),
    };
    await request(app.getHttpServer()).post('/visitas').send({ ...cadastro, clienteNome: '  ' }).expect(400);
    const r = await request(app.getHttpServer()).post('/visitas').send(cadastro).expect(201);
    expect(r.body.clienteNome).toBe('Empresa livre');
    expect(r.body.cnpj).toBe(cadastro.cnpj);
    expect(r.body.clienteId).toBeUndefined();
    await request(app.getHttpServer()).post('/visitas').send({ ...cadastro, clienteId: autor }).expect(400);
  });
  it('realiza visita própria e avança somente para validação', async () => {
    await request(app.getHttpServer())
      .post('/visitas/' + id + '/realizar')
      .send(dados)
      .expect(201);
    expect(visita.status).toBe('AGUARDANDO_VALIDACAO');
  });
  it('rejeita alteração de status por campo extra no DTO', async () => {
    await request(app.getHttpServer())
      .post('/visitas/' + id + '/realizar')
      .send({ ...dados, status: 'CONCLUIDA' })
      .expect(400);
    expect(visita.status).toBe('AGUARDANDO_REALIZACAO');
  });
  it('bloqueia acesso a visita de outro atendente', async () => {
    await request(app.getHttpServer())
      .post('/visitas/' + id + '/realizar')
      .set('x-test-user', 'outro')
      .send(dados)
      .expect(403);
    expect(visita.status).toBe('AGUARDANDO_REALIZACAO');
  });
  it('revoga acesso de usuário inativo mesmo com JWT válido', async () => {
    ativo = false;
    await request(app.getHttpServer())
      .post('/visitas/' + id + '/realizar')
      .send(dados)
      .expect(403);
  });
  it('não confia no ADMIN antigo do JWT para permitir validação', async () => {
    visita.status = 'AGUARDANDO_VALIDACAO';
    await request(app.getHttpServer())
      .post('/visitas/' + id + '/validar')
      .send({ decisao: 'APROVAR' })
      .expect(403);
    expect(visita.status).toBe('AGUARDANDO_VALIDACAO');
  });
  it('rejeita campos inválidos e bloqueia realização antes do início', async () => {
    await request(app.getHttpServer())
      .post('/visitas/' + id + '/realizar')
      .send({ ...dados, emailPessoaAtendeu: 'invalido' })
      .expect(400);
    visita.status = 'AGENDADA';
    await request(app.getHttpServer())
      .post('/visitas/' + id + '/realizar')
      .send(dados)
      .expect(409);
    expect(visita.status).toBe('AGENDADA');
  });
});
