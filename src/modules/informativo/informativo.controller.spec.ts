import {
  ExecutionContext,
  INestApplication,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
import type { InformativoAssinante, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InformativoController } from './informativo.controller';
import { InformativoService } from './informativo.service';
import { IntegracaoInformativoGuard } from './guards/integracao-informativo.guard';

describe('Informativo HTTP', () => {
  let app: INestApplication<Server>;
  const assinantes = {
    upsert: jest
      .fn<Promise<unknown>, [Prisma.InformativoAssinanteUpsertArgs]>()
      .mockResolvedValue({}),
    findMany: jest
      .fn<
        Promise<InformativoAssinante[]>,
        [Prisma.InformativoAssinanteFindManyArgs]
      >()
      .mockResolvedValue([]),
    count: jest
      .fn<Promise<number>, [Prisma.InformativoAssinanteCountArgs?]>()
      .mockResolvedValue(0),
  };
  const prisma = {
    informativoAssinante: assinantes,
    $transaction: (queries: Promise<unknown>[]) => Promise.all(queries),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [InformativoController],
      providers: [
        InformativoService,
        IntegracaoInformativoGuard,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: { get: () => 'test-informativo-token' },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest<{
            headers: Record<string, string>;
            user?: { role: string };
          }>();
          const role = req.headers['x-test-role'];
          if (!role) return false;
          req.user = { role };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  beforeEach(() => jest.clearAllMocks());
  afterAll(async () => {
    await app.close();
  });

  it('exige token de integração antes de gravar', async () => {
    await request(app.getHttpServer())
      .post('/api/informativo/site')
      .send({ nome: 'Maria', email: 'maria@example.com' })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/informativo/site')
      .set('x-integration-token', 'wrong')
      .send({ nome: 'Maria', email: 'maria@example.com' })
      .expect(403);
    expect(assinantes.upsert).not.toHaveBeenCalled();
  });

  it('normaliza nome e e-mail, usa chave única e retorna apenas confirmação', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/informativo/site')
      .set('x-integration-token', 'test-informativo-token')
      .send({
        nome: '  Maria   Silva ',
        email: ' MARIA@EXAMPLE.COM ',
        aceitePrivacidade: true,
      })
      .expect(200);
    expect(assinantes.upsert).toHaveBeenCalledWith({
      where: { email: 'maria@example.com' },
      create: {
        nome: 'Maria Silva',
        email: 'maria@example.com',
        status: 'ATIVO',
        origem: 'SITE_PIZZATTOLOG',
        aceitePrivacidade: true,
      },
      update: { nome: 'Maria Silva', status: 'ATIVO', aceitePrivacidade: true },
    });
    expect(Object.keys(response.body as { message: string })).toEqual([
      'message',
    ]);
  });

  it('envios repetidos reativam pela mesma chave e preservam aceite omitido', async () => {
    await Promise.all(
      [1, 2].map(() =>
        request(app.getHttpServer())
          .post('/api/informativo/site')
          .set('x-integration-token', 'test-informativo-token')
          .send({ nome: 'Maria', email: 'maria@example.com' })
          .expect(200),
      ),
    );
    for (const [query] of assinantes.upsert.mock.calls) {
      expect(query.where).toEqual({ email: 'maria@example.com' });
      expect(query.update).toEqual({ nome: 'Maria', status: 'ATIVO' });
    }
  });

  it.each([
    { nome: '   ', email: 'maria@example.com' },
    { nome: 'Maria', email: 'invalid' },
    { nome: 42, email: 'maria@example.com' },
    { nome: 'Maria', email: 'maria@example.com', aceitePrivacidade: 'true' },
    { nome: 'Maria', email: 'maria@example.com', aceitePrivacidade: null },
    { nome: 'Maria', email: 'maria@example.com', status: 'ATIVO' },
  ])('rejeita cadastro inválido %j', async (payload) => {
    await request(app.getHttpServer())
      .post('/api/informativo/site')
      .set('x-integration-token', 'test-informativo-token')
      .send(payload)
      .expect(400);
    expect(assinantes.upsert).not.toHaveBeenCalled();
  });

  it('protege listagem por autenticação e perfil', async () => {
    await request(app.getHttpServer()).get('/api/informativo').expect(403);
    await request(app.getHttpServer())
      .get('/api/informativo')
      .set('x-test-role', 'COMERCIAL')
      .expect(403);
    expect(assinantes.findMany).not.toHaveBeenCalled();
    await request(app.getHttpServer())
      .get('/api/informativo')
      .set('x-test-role', 'ADMIN')
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/informativo')
      .set('x-test-role', 'MARKETING')
      .expect(200);
  });

  it('pesquisa por nome/e-mail e status, ordena por cadastro e mantém totais gerais', async () => {
    assinantes.count
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(2);
    const response = await request(app.getHttpServer())
      .get('/api/informativo?q=Maria&status=ATIVO')
      .set('x-test-role', 'MARKETING')
      .expect(200);
    expect(assinantes.findMany).toHaveBeenCalledWith({
      where: {
        status: 'ATIVO',
        OR: [
          { nome: { contains: 'Maria', mode: 'insensitive' } },
          { email: { contains: 'Maria', mode: 'insensitive' } },
        ],
      },
      orderBy: { criadoEm: 'desc' },
    });
    expect(
      (
        response.body as {
          totais: { total: number; ativos: number; descadastrados: number };
        }
      ).totais,
    ).toEqual({
      total: 8,
      ativos: 6,
      descadastrados: 2,
    });
    await request(app.getHttpServer())
      .get('/api/informativo?status=INVALIDO')
      .set('x-test-role', 'MARKETING')
      .expect(400);
  });

  it('oculta falhas técnicas de persistência', async () => {
    const log = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    assinantes.upsert.mockRejectedValueOnce(
      new Error('Unique constraint failed: internal database details'),
    );
    const response = await request(app.getHttpServer())
      .post('/api/informativo/site')
      .set('x-integration-token', 'test-informativo-token')
      .send({ nome: 'Maria', email: 'maria@example.com' })
      .expect(503);
    expect((response.body as { message: string }).message).toContain(
      'Tente novamente',
    );
    expect(JSON.stringify(response.body)).not.toContain('Unique constraint');
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
