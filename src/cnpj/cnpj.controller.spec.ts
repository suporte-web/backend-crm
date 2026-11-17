import { INestApplication, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { CnpjModule } from './cnpj.module';
import { CNPJ_HTTP } from './cnpj.types';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { UsersService } from '../users/users.service';

describe('Rota CNPJ com autenticação e autorização existentes', () => {
  let app: INestApplication;
  const http = jest.fn();
  const users = { findOne: jest.fn() };
  const jwt = new JwtService({ secret: 'somente-testes-cnpj' });
  beforeAll(async () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    const module = await Test.createTestingModule({
      imports: [ConfigModule, CnpjModule],
      providers: [JwtStrategy, { provide: UsersService, useValue: users }],
    }).overrideProvider(ConfigService).useValue(new ConfigService({ JWT_SECRET: 'somente-testes-cnpj' }))
      .overrideProvider(CNPJ_HTTP).useValue(http).compile();
    app = module.createNestApplication(); app.setGlobalPrefix('api'); await app.init();
  });
  beforeEach(() => { http.mockReset(); users.findOne.mockReset(); });
  afterAll(async () => { await app?.close(); jest.restoreAllMocks(); });
  const token = () => jwt.sign({ sub: 'u1', email: 'teste@example.test', role: 'COMERCIAL' });
  it('sem token retorna 401 sem consultar provedor', async () => {
    await request(app.getHttpServer()).get('/api/cnpj/00000000000191').expect(401);
    expect(http).not.toHaveBeenCalled();
  });
  it('perfil CLIENTE retorna 403 mesmo com token válido', async () => {
    users.findOne.mockResolvedValue({ id: 'u1', role: 'CLIENTE', isActive: true });
    await request(app.getHttpServer()).get('/api/cnpj/00000000000191').set('Authorization', `Bearer ${token()}`).expect(403);
    expect(http).not.toHaveBeenCalled();
  });
  it('usuário inativo retorna 401', async () => {
    users.findOne.mockResolvedValue({ id: 'u1', role: 'COMERCIAL', isActive: false });
    await request(app.getHttpServer()).get('/api/cnpj/00000000000191').set('Authorization', `Bearer ${token()}`).expect(401);
    expect(http).not.toHaveBeenCalled();
  });
  it('Comercial recebe dados normalizados, sem payload bruto ou QSA', async () => {
    users.findOne.mockResolvedValue({ id: 'u1', role: 'COMERCIAL', isActive: true });
    http.mockResolvedValue({ status: 200, headers: {}, data: { cnpj: '00000000000191', razao_social: 'Empresa', qsa: [{ nome_socio: 'Privado' }] } });
    const result = await request(app.getHttpServer()).get('/api/cnpj/00000000000191').set('Authorization', `Bearer ${token()}`).expect(200);
    expect(result.body).toMatchObject({ legalName: 'Empresa', provider: 'minhareceita' });
    expect(result.body).not.toHaveProperty('qsa');
  });
  it('CNPJ inválido retorna 400 com código estável', async () => {
    users.findOne.mockResolvedValue({ id: 'u1', role: 'COMERCIAL', isActive: true });
    const result = await request(app.getHttpServer()).get('/api/cnpj/12345678901234').set('Authorization', `Bearer ${token()}`).expect(400);
    expect(result.body.code).toBe('CNPJ_INVALID'); expect(http).not.toHaveBeenCalled();
  });
});
