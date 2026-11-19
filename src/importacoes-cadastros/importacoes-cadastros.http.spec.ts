import { ExecutionContext, INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ImportacoesCadastrosController } from './importacoes-cadastros.controller';
import { ImportacoesCadastrosService } from './importacoes-cadastros.service';

describe('Contrato HTTP da importação', () => {
  let app: INestApplication;
  const id = '00000000-0000-4000-8000-000000000001';
  const service = { preparar: jest.fn(), confirmar: jest.fn(), opcoes: jest.fn(), listar: jest.fn(), obter: jest.fn() };
  beforeAll(async () => {
    const module = await Test.createTestingModule({ controllers: [ImportacoesCadastrosController], providers: [{ provide: ImportacoesCadastrosService, useValue: service }] })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate(ctx: ExecutionContext) {
        const req = ctx.switchToHttp().getRequest();
        if (!req.headers.authorization) throw new UnauthorizedException();
        req.user = { sub: id, role: req.headers['x-role'] || 'CONSULTORA' }; return true;
      } }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });
  beforeEach(() => { jest.clearAllMocks(); service.preparar.mockResolvedValue({ id }); service.confirmar.mockResolvedValue({ id, status: 'CONCLUIDA' }); });
  afterAll(async () => app.close());
  it('exige autenticação e perfil permitido antes de receber o arquivo', async () => {
    await request(app.getHttpServer()).get('/importacoes-cadastros/opcoes').expect(401);
    await request(app.getHttpServer()).get('/importacoes-cadastros/opcoes').set('Authorization', 'teste').set('x-role', 'CLIENTE').expect(403);
    expect(service.opcoes).not.toHaveBeenCalled();
  });
  it('recebe multipart sem depender de caminhos no servidor', async () => {
    await request(app.getHttpServer()).post('/importacoes-cadastros/previa').set('Authorization', 'teste').field('responsavelId', id).attach('arquivo', Buffer.from('teste'), 'teste.xlsx').expect(201);
    expect(service.preparar).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ buffer: expect.any(Buffer), originalname: 'teste.xlsx' }), expect.objectContaining({ responsavelId: id }));
  });
  it('recebe arquivo, responsavel e empresa no mesmo multipart', async () => {
    const empresaConsultoraId = '00000000-0000-4000-8000-000000000002';
    await request(app.getHttpServer()).post('/importacoes-cadastros/previa').set('Authorization', 'teste')
      .attach('arquivo', Buffer.from('teste'), 'teste.xlsx')
      .field('responsavelId', id).field('empresaConsultoraId', empresaConsultoraId).expect(201);
    expect(service.preparar).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({ responsavelId: id, empresaConsultoraId }));
  });
  it('rejeita campos excedentes no multipart', async () => {
    await request(app.getHttpServer()).post('/importacoes-cadastros/previa').set('Authorization', 'teste')
      .field('responsavelId', id).field('empresaConsultoraId', id).field('extra', 'indevido')
      .attach('arquivo', Buffer.from('teste'), 'teste.xlsx').expect(400);
    expect(service.preparar).not.toHaveBeenCalled();
  });
  it('bloqueia arquivo acima de 5 MB', async () => {
    await request(app.getHttpServer()).post('/importacoes-cadastros/previa').set('Authorization', 'teste').field('responsavelId', id).attach('arquivo', Buffer.alloc(5 * 1024 * 1024 + 1), 'teste.xlsx').expect(413);
    expect(service.preparar).not.toHaveBeenCalled();
  });
  it('aceita os campos da decisão e rejeita dados de origem adulterados', async () => {
    const linha = { numero: 2, etapa: 'entrada_leads', segmentoId: null, segmentoAutomatico: false };
    await request(app.getHttpServer()).post(`/importacoes-cadastros/${id}/confirmar`).set('Authorization', 'teste').send({ linhas: [linha] }).expect(201);
    await request(app.getHttpServer()).post(`/importacoes-cadastros/${id}/confirmar`).set('Authorization', 'teste').send({ linhas: [{ ...linha, empresaConsultoraId: id, nome: 'Adulterado' }] }).expect(400);
    expect(service.confirmar).toHaveBeenCalledTimes(1);
  });
});
