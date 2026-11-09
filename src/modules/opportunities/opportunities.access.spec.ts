import {
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { OpportunitiesController } from './opportunities.controller';
import { OpportunitiesService } from './opportunities.service';
import { ClientsController } from '../clientes/clients.controller';
import { ClientsService } from '../clientes/clients.service';
import { GestaoProspeccoesController } from '../leads/gestao-prospeccoes.controller';
import { GestaoProspeccoesService } from '../leads/gestao-prospeccoes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';

describe('Autorização HTTP de oportunidades e prospecções', () => {
  let app: INestApplication;
  let habilitada = true;
  const clientes = ['c1', 'c2'].map((owner, i) => ({
    id: `00000000-0000-4000-8000-00000000000${i}`,
    companyName: `Empresa ${i}`, modalidadeCadastro: 'CLIENTE', prospectedById: owner, prospectedByName: owner,
    internalOwnerId: owner,
    quotes: [],
    opportunities: [],
    timelineEvents: [],
    documents: [
      {
        id: 'proposta',
        category: 'OPORTUNIDADE_PROPOSTA',
        url: '/uploads/client-documents/proposta.pdf',
      },
      {
        id: 'contrato',
        category: 'CONTRATO',
        url: '/uploads/client-documents/contrato.pdf',
      },
    ],
    contacts: [],
    user: null,
    createdAt: new Date('2026-10-20T12:00:00Z'),
  }));
  beforeAll(async () => {
    const prisma = {
      roleScreenPermission: {
        findUnique: async () => ({ isEnabled: habilitada }),
        findMany: async () => [{ role: 'CONSULTORA', screenKey: 'opportunities', isEnabled: habilitada }],
      },
      client: {
        count: async () => clientes.length,
        findFirst: async ({ where }: any) => clientes.find(c => c.id === where.id),
        findUnique: async ({ where }: any) =>
          clientes.find((c) => c.id === where.id),
        findMany: async ({ where }: any) =>
          clientes.filter(
            (c) =>
              !where.internalOwnerId ||
              c.internalOwnerId === where.internalOwnerId,
          ),
      },
      opportunity: {
        findMany: async ({ where, include }: any) =>
          clientes
            .filter(
              (c) =>
                !where.client?.internalOwnerId ||
                c.internalOwnerId === where.client.internalOwnerId,
            )
            .map((client) => {
              const user = {
                id: 'login',
                name: 'Cliente',
                email: 'cliente@example.test',
                role: 'CLIENTE',
                passwordHash: 'segredo-de-teste',
              };
              const shape = include.client.include.user;
              return {
                id: `op-${client.internalOwnerId}`,
                client: {
                  ...client,
                  user:
                    shape === true
                      ? user
                      : Object.fromEntries(
                          Object.keys(shape.select).map((key) => [
                            key,
                            user[key as keyof typeof user],
                          ]),
                        ),
                },
              };
            }),
        findUnique: async ({ where }: any) => {
          const client = where.id === 'op-c1' ? clientes[0] : clientes[1];
          return { id: where.id, clientId: client.id, client, title: 'Proposta' };
        },
        findFirst: async () => ({
          id: 'op-c2',
          clientId: clientes[1].id,
          client: clientes[1],
          title: 'Outra',
        }),
        update: async ({ data }: any) => ({ id: 'op-c2', ...data }),
      },
      user: {
        findMany: async () => [
          { id: 'c1', name: 'Maria' },
          { id: 'c2', name: 'Ana' },
        ],
      },
      lead: { findMany: async () => [], findUnique: async () => null, count: async () => 0 },
      prospect: { findMany: async () => [], count: async () => 0 },
    };
    const module = await Test.createTestingModule({
      controllers: [
        OpportunitiesController,
        ClientsController,
        GestaoProspeccoesController,
      ],
      providers: [
        OpportunitiesService,
        ClientsService,
        GestaoProspeccoesService,
        RolesGuard,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: {} },
        { provide: NotificationsService, useValue: {} },
        { provide: UsersService, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = {
            sub: 'c1',
            role: req.headers['x-test-role'] ?? 'CONSULTORA',
            email: 'test@example.invalid',
          };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });
  beforeEach(() => {
    habilitada = true;
  });
  afterAll(async () => {
    await app?.close();
  });

  it('Consultora habilitada acessa lista, cadastros e detalhes somente próprios', async () => {
    const lista = await request(app.getHttpServer())
      .get('/opportunities')
      .expect(200);
    expect(lista.body.map((r: any) => r.id)).toEqual(['op-c1']);
    expect(lista.body[0].client.user).not.toHaveProperty('passwordHash');
    expect(lista.body[0].client.modalidadeCadastro).toBe('CLIENTE');
    const cadastros = await request(app.getHttpServer())
      .get('/opportunities/clients')
      .expect(200);
    expect(cadastros.body.map((r: any) => r.internalOwnerId)).toEqual(['c1']);
    const detalhe = await request(app.getHttpServer())
      .get(`/clients/${clientes[0].id}/opportunities/detail`)
      .expect(200);
    expect(detalhe.body.client.documents.map((d: any) => d.id)).toEqual([
      'proposta',
    ]);
    await request(app.getHttpServer())
      .get(`/clients/${clientes[1].id}/opportunities/detail`)
      .expect(403);
  });
  it('revogar a permissão bloqueia todas as rotas de consulta e escrita', async () => {
    habilitada = false;
    await request(app.getHttpServer()).get('/opportunities').expect(403);
    await request(app.getHttpServer())
      .get('/opportunities/clients')
      .expect(403);
    await request(app.getHttpServer())
      .get(`/clients/${clientes[0].id}/opportunities/detail`)
      .expect(403);
    await request(app.getHttpServer())
      .post('/opportunities')
      .send({ clientId: clientes[0].id, title: 'Proposta' })
      .expect(403);
    await request(app.getHttpServer())
      .delete('/opportunities/op-c1')
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/clients/${clientes[0].id}/opportunities/op-c1/status`)
      .send({ status: 'OPEN' })
      .expect(403);
    await request(app.getHttpServer())
      .post(`/clients/${clientes[0].id}/documents`)
      .send({})
      .expect(403);
  });
  it('bloqueia criação e alteração por ID de outra consultora', async () => {
    await request(app.getHttpServer())
      .post('/opportunities')
      .send({ clientId: clientes[1].id, title: 'Outra proposta' })
      .expect(403);
    await request(app.getHttpServer())
      .patch('/opportunities/op-c2')
      .send({ title: 'Alteração' })
      .expect(403);
    await request(app.getHttpServer())
      .patch('/opportunities/op-c2/stage')
      .send({ stage: 'PROPOSTA' })
      .expect(403);
    await request(app.getHttpServer())
      .delete('/opportunities/op-c2')
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/clients/${clientes[1].id}/opportunities/op-c2/status`)
      .send({ status: 'OPEN' })
      .expect(403);
    await request(app.getHttpServer())
      .post(`/clients/${clientes[1].id}/documents`)
      .send({})
      .expect(403);
  });
  it('Comercial acessa informações de ambas as consultoras e a Gestão de Prospecções', async () => {
    const lista = await request(app.getHttpServer())
      .get('/opportunities')
      .set('x-test-role', 'COMERCIAL')
      .expect(200);
    expect(lista.body).toHaveLength(2);
    await request(app.getHttpServer())
      .get(`/clients/${clientes[1].id}/opportunities/detail`)
      .set('x-test-role', 'COMERCIAL')
      .expect(200);
    const gestao = await request(app.getHttpServer())
      .get('/gestao-prospeccoes')
      .set('x-test-role', 'COMERCIAL')
      .expect(200);
    expect(gestao.body.total).toBe(2);
    await request(app.getHttpServer())
      .get('/gestao-prospeccoes/opcoes')
      .set('x-test-role', 'COMERCIAL')
      .expect(200);
    await request(app.getHttpServer())
      .get(`/gestao-prospeccoes/CLIENTE/${clientes[1].id}/historico`)
      .set('x-test-role', 'COMERCIAL')
      .expect(200);
  });
  it.each(['CONSULTORA', 'MARKETING', 'CLIENTE'])(
    'mantém Gestão de Prospecções protegida para %s',
    async (role) => {
      await request(app.getHttpServer())
        .get('/gestao-prospeccoes')
        .set('x-test-role', role)
        .expect(403);
      await request(app.getHttpServer())
        .get('/gestao-prospeccoes/opcoes')
        .set('x-test-role', role)
        .expect(403);
    },
  );
});
