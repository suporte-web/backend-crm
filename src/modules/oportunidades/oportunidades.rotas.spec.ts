import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { OportunidadesController } from './oportunidades.controller';
import { OportunidadesService } from './oportunidades.service';
import { ClientsService } from '../clientes/clients.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('Rotas locais de Oportunidades/Propostas', () => {
  let app: INestApplication;
  let habilitada: boolean | undefined;
  const cadastros = [
    {
      id: 'c1',
      companyName: 'Minha empresa',
      internalOwnerId: 'consultora',
      modalidadeCadastro: 'LEAD',
    },
    {
      id: 'c2',
      companyName: 'Outra empresa',
      internalOwnerId: 'outra',
      modalidadeCadastro: 'CLIENTE',
    },
  ];
  const prisma = {
    roleScreenPermission: {
      findMany: async () =>
        habilitada === undefined
          ? []
          : ['CONSULTORA', 'COMERCIAL'].map((role) => ({
              role,
              screenKey: 'opportunities',
              isEnabled: habilitada,
            })),
    },
    client: {
      findUnique: async ({ where }: any) =>
        cadastros.find((c) => c.id === where.id),
      findMany: async ({ where }: any) =>
        cadastros.filter(
          (c) =>
            (!where.internalOwnerId ||
              c.internalOwnerId === where.internalOwnerId) &&
            (!where.modalidadeCadastro ||
              where.modalidadeCadastro.in.includes(c.modalidadeCadastro)),
        ),
    },
    opportunity: {
      findMany: async ({ where }: any) =>
        cadastros
          .filter(
            (c) =>
              !where.client.internalOwnerId ||
              c.internalOwnerId === where.client.internalOwnerId,
          )
          .map((client) => ({ id: 'op-' + client.id, client })),
    },
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [OportunidadesController],
      providers: [
        OportunidadesService,
        RolesGuard,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: {} },
        {
          provide: ClientsService,
          useValue: {
            getDetail: async (_: unknown, id: string) => ({
              client: {
                ...cadastros.find((c) => c.id === id),
                documents: [
                  { category: 'CONTRATO' },
                  { category: 'OPORTUNIDADE_PROPOSTA' },
                ],
              },
              opportunities: [],
              timeline: [],
            }),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest();
          req.user = {
            sub: 'consultora',
            role: req.headers['x-test-role'] || 'CONSULTORA',
            email: 'test@example.invalid',
          };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });
  beforeEach(() => {
    habilitada = true;
  });
  afterAll(async () => {
    await app?.close();
  });
  it('registra /api/opportunities/clients e a rota em português', async () => {
    for (const rota of ['opportunities', 'oportunidades']) {
      const res = await request(app.getHttpServer())
        .get(`/api/${rota}/clients`)
        .set('x-test-role', 'COMERCIAL')
        .expect(200);
      expect(res.body.map((c: any) => c.id)).toEqual(['c1', 'c2']);
    }
  });
  it('Consultora recebe somente cadastros e oportunidades sob sua responsabilidade', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/opportunities/clients')
      .expect(200);
    expect(res.body.map((c: any) => c.id)).toEqual(['c1']);
    const lista = await request(app.getHttpServer())
      .get('/api/opportunities')
      .expect(200);
    expect(lista.body.map((o: any) => o.client.id)).toEqual(['c1']);
  });
  it('Comercial vê oportunidades das duas responsáveis', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/opportunities')
      .set('x-test-role', 'COMERCIAL')
      .expect(200);
    expect(res.body).toHaveLength(2);
  });
  it.each([false, undefined])(
    'Consultora exige liberação explícita (%s)',
    async (enabled) => {
      habilitada = enabled;
      await request(app.getHttpServer())
        .get('/api/opportunities/clients')
        .expect(403);
      await request(app.getHttpServer()).get('/api/opportunities').expect(403);
      await request(app.getHttpServer())
        .get('/api/opportunities/clients/c1/detail')
        .expect(403);
    },
  );
  it('abre propostas próprias e rejeita identificador de outro cadastro', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/opportunities/clients/c1/detail')
      .expect(200);
    expect(res.body.client.documents).toEqual([
      { category: 'OPORTUNIDADE_PROPOSTA' },
    ]);
    await request(app.getHttpServer())
      .get('/api/opportunities/clients/c2/detail')
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/opportunities/clients/inexistente/detail')
      .expect(404);
  });
  it('Comercial pode abrir propostas de outra responsável', async () => {
    await request(app.getHttpServer())
      .get('/api/opportunities/clients/c2/detail')
      .set('x-test-role', 'COMERCIAL')
      .expect(200);
  });
  it('Cliente não acessa cadastros das oportunidades', async () => {
    await request(app.getHttpServer())
      .get('/api/opportunities/clients')
      .set('x-test-role', 'CLIENTE')
      .expect(403);
  });
  it('respeita a revogação de acesso do Comercial em todas as consultas', async () => {
    habilitada = false;
    for (const rota of [
      '/api/opportunities',
      '/api/opportunities/clients',
      '/api/opportunities/clients/c2/detail',
    ]) {
      await request(app.getHttpServer())
        .get(rota)
        .set('x-test-role', 'COMERCIAL')
        .expect(403);
    }
  });
});
