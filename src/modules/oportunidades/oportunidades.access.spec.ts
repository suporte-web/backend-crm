import {
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { OportunidadesController as OpportunitiesController } from './oportunidades.controller';
import { OportunidadesService as OpportunitiesService } from './oportunidades.service';
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

function matches(row: any, where: any = {}): boolean {
  return Object.entries(where).every(([key, value]: [string, any]) => {
    if (key === 'AND') return value.every((item: any) => matches(row, item));
    if (key === 'OR') return value.some((item: any) => matches(row, item));
    if (value && typeof value === 'object') {
      if ('path' in value) return value.path.reduce((item: any, part: string) => item?.[part], row[key]) === value.equals;
      if ('in' in value) return value.in.includes(row[key]);
      if ('not' in value) return row[key] != value.not;
      return !!row[key] && matches(row[key], value);
    }
    return row[key] === value;
  });
}

describe('Autorização HTTP de oportunidades e prospecções', () => {
  let app: INestApplication;
  let habilitada = true;
  let oportunidades: Array<Record<string, any>>;
  let eventos: Array<Record<string, any>>;
  const clientes = ['c1', 'c2', 'c1'].map((owner, i) => ({
    id: `00000000-0000-4000-8000-00000000000${i}`,
    companyName: `Empresa ${i}`, modalidadeCadastro: 'CLIENTE', prospectedById: owner, prospectedByName: owner,
    internalOwnerId: owner,
    leadCadastro: { metadata: { responsible: i === 2 ? 'OUTRO' : 'MCG' } },
    quotes: [],
    opportunities: [],
    timelineEvents: [],
    documents: [
      {
        id: 'proposta',
        category: 'OPORTUNIDADE_PROPOSTA',
        uploadedById: owner,
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
        count: async ({ where }: any) => clientes.filter((c) => matches(c, where)).length,
        findFirst: async ({ where }: any) => clientes.find((c) => matches(c, where)),
        findUnique: async ({ where }: any) => {
          const client = clientes.find((c) => c.id === where.id);
          return client && { ...client, opportunities: oportunidades.filter((o) => o.clientId === client.id), timelineEvents: eventos.filter((e) => e.clientId === client.id) };
        },
        findMany: async ({ where }: any) => clientes.filter((c) => matches(c, where)),
      },
      opportunity: {
        findMany: async ({ where, include }: any) => oportunidades.filter((o) => matches(o, where)).map((o) => {
          const user = { id: 'login', name: 'Cliente', email: 'cliente@example.test', role: 'CLIENTE', passwordHash: 'segredo-de-teste' };
          const shape = include.client.include.user;
          return { ...o, client: { ...o.client, user: shape === true ? user : Object.fromEntries(Object.keys(shape.select).map((key) => [key, user[key as keyof typeof user]])) } };
        }),
        findUnique: async ({ where }: any) => oportunidades.find((o) => matches(o, where)),
        findFirst: async ({ where }: any) => oportunidades.find((o) => matches(o, where)),
        create: async ({ data }: any) => {
          const row = { id: 'op-nova', ...data, client: clientes.find((c) => c.id === data.clientId) };
          oportunidades.push(row);
          return row;
        },
        update: async ({ where, data }: any) => Object.assign(oportunidades.find((o) => o.id === where.id)!, data),
        delete: async ({ where }: any) => { oportunidades = oportunidades.filter((o) => o.id !== where.id); },
      },
      timelineEvent: {
        findMany: async ({ where }: any) => eventos.filter((e) => matches(e, where)),
        findFirst: async ({ where }: any) => eventos.find((e) => matches(e, where)),
        create: async ({ data }: any) => { const event = { id: 'evento-novo', ...data }; eventos.push(event); return event; },
      },
      user: {
        findMany: async () => [
          { id: 'c1', name: 'Maria' },
          { id: 'c2', name: 'Ana' },
        ],
      },
      lead: { findMany: async () => [], findUnique: async ({ where }: any) => { const c = clientes.find((c) => c.id === where.cadastroId); return c ? { ...c.leadCadastro, createdById: c.prospectedById } : null; }, count: async () => 0 },
      prospect: { findMany: async () => [], count: async () => 0 },
    };
    const db = { ...prisma, $transaction: async (action: any) => {
      const anteriores = oportunidades.map((o) => ({ ...o })), historico = [...eventos];
      try { return await action(prisma); } catch (error) { oportunidades = anteriores; eventos = historico; throw error; }
    } };
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
        { provide: PrismaService, useValue: db },
        { provide: AuditLogsService, useValue: { create: async () => {} } },
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
    oportunidades = clientes.map((client, i) => ({ id: i === 2 ? 'op-nao-mcg' : 'op-c' + (i + 1), clientId: client.id, client, title: 'Proposta', stage: 'NOVO', status: 'OPEN' }));
    oportunidades.push({ ...oportunidades[0], id: 'op-comercial' }, { ...oportunidades[1], id: 'op-compartilhada' });
    eventos = oportunidades.map((o) => ({ id: 'evento-' + o.id, clientId: o.clientId, type: 'OPPORTUNITY_CREATED', title: 'Criada', createdAt: new Date(), createdBy: null, createdById: o.id === 'op-c2' ? 'c2' : o.id === 'op-comercial' ? 'vendedor' : 'c1', metadata: { opportunityId: o.id } }));
  });
  afterAll(async () => {
    await app?.close();
  });

  it('Consultora lista suas oportunidades MCG, todos os cadastros MCG e detalhes próprios', async () => {
    const lista = await request(app.getHttpServer())
      .get('/opportunities')
      .expect(200);
    expect(lista.body.map((r: any) => r.id)).toEqual(['op-c1', 'op-compartilhada']);
    expect(lista.body[0].client.user).not.toHaveProperty('passwordHash');
    expect(lista.body[0].client.modalidadeCadastro).toBe('CLIENTE');
    const cadastros = await request(app.getHttpServer())
      .get('/opportunities/clients')
      .expect(200);
    expect(cadastros.body.map((r: any) => r.internalOwnerId)).toEqual(['c1', 'c2']);
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
    await request(app.getHttpServer()).get('/opportunities/motivos-perda').expect(403);
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
      .patch('/opportunities/op-c1')
      .send({ title: 'Alteração' })
      .expect(403);
    await request(app.getHttpServer())
      .patch('/opportunities/op-c1/stage')
      .send({ stage: 'PROPOSTA' })
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
  it('bloqueia criação fora de MCG e alteração por ID de outra consultora', async () => {
    await request(app.getHttpServer())
      .post('/opportunities')
      .send({ clientId: clientes[2].id, title: 'Outra proposta' })
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
    expect(lista.body).toHaveLength(5);
    await request(app.getHttpServer())
      .get(`/clients/${clientes[1].id}/opportunities/detail`)
      .set('x-test-role', 'COMERCIAL')
      .expect(200);
    const gestao = await request(app.getHttpServer())
      .get('/gestao-prospeccoes')
      .set('x-test-role', 'COMERCIAL')
      .expect(200);
    expect(gestao.body.total).toBe(3);
    await request(app.getHttpServer())
      .get('/gestao-prospeccoes/opcoes')
      .set('x-test-role', 'COMERCIAL')
      .expect(200);
    await request(app.getHttpServer())
      .get(`/gestao-prospeccoes/CLIENTE/${clientes[1].id}/historico`)
      .set('x-test-role', 'COMERCIAL')
      .expect(200);
  });
  it('permite criar em cadastro MCG de outra pessoa com autoria da sessão', async () => {
    const criada = await request(app.getHttpServer())
      .post('/opportunities')
      .send({ clientId: clientes[1].id, title: 'Proposta compartilhada' })
      .expect(201);
    expect(eventos.find((e) => e.metadata.opportunityId === criada.body.id)).toEqual(
      expect.objectContaining({ clientId: clientes[1].id, createdById: 'c1' }),
    );
    const lista = await request(app.getHttpServer()).get('/opportunities').expect(200);
    expect(lista.body.map((o: any) => o.id)).toContain(criada.body.id);
  });
  it('bloqueia propostas do Comercial no mesmo cadastro MCG e propostas próprias fora de MCG', async () => {
    for (const [id, client] of [['op-comercial', clientes[0]], ['op-nao-mcg', clientes[2]]] as const) {
      await request(app.getHttpServer()).patch(`/opportunities/${id}`).send({ title: 'Indevida' }).expect(403);
      await request(app.getHttpServer()).patch(`/opportunities/${id}/stage`).send({ stage: 'PROPOSTA' }).expect(403);
      await request(app.getHttpServer()).delete(`/opportunities/${id}`).expect(403);
      await request(app.getHttpServer()).patch(`/clients/${client.id}/opportunities/${id}/status`).send({ status: 'OPEN' }).expect(403);
    }
    expect(oportunidades).toHaveLength(5);
    expect(oportunidades.every((o) => o.title === 'Proposta')).toBe(true);
    expect(eventos).toHaveLength(5);
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
