import {
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OpportunityStage, OpportunityStatus } from '@prisma/client';
import request from 'supertest';
import { OportunidadesController } from './oportunidades.controller';
import { OportunidadesService } from './oportunidades.service';
import { ClientsController } from '../clientes/clients.controller';
import { ClientsService } from '../clientes/clients.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AcessoCadastroGuard } from '../cadastros/acesso-cadastro.guard';

describe('API de motivos de perda — contratos atuais', () => {
  let app: INestApplication;
  const clienteId = '550e8400-e29b-41d4-a716-446655440000';
  const cliente = {
    id: clienteId,
    internalOwnerId: 'vendedora',
    modalidadeCadastro: 'CLIENTE',
    companyName: 'Empresa',
    user: null,
    quotes: [],
    timelineEvents: [],
    contacts: [],
    documents: [],
  };
  const oportunidade = {
    id: 'o1',
    clientId: clienteId,
    title: 'Proposta',
    stage: OpportunityStage.PROPOSTA as OpportunityStage,
    status: OpportunityStatus.OPEN as OpportunityStatus,
    lostReason: null as string | null,
    motivoPerda: null as string | null,
    observacaoPerda: null as string | null,
    client: cliente,
  };
  const historico = jest.fn(async (_args: unknown) => ({}));
  beforeAll(async () => {
    const oportunidadeDb = {
      findUnique: async () => ({ ...oportunidade }),
      findFirst: async () => ({ ...oportunidade }),
      update: async ({ data }: { data: object }) =>
        Object.assign(oportunidade, data),
      create: async ({ data }: { data: object }) => ({
        ...oportunidade,
        ...data,
      }),
    };
    const tx = {
      opportunity: oportunidadeDb,
      timelineEvent: { create: historico },
    };
    const prisma = {
      ...tx,
      client: {
        findUnique: async () => ({ ...cliente, opportunities: [oportunidade] }),
      },
      roleScreenPermission: {
        findMany: async () => [
          { role: 'CONSULTORA', screenKey: 'opportunities', isEnabled: true },
        ],
      },
      $transaction: async <T>(fn: (t: typeof tx) => Promise<T>) => fn(tx),
    };
    const module = await Test.createTestingModule({
      controllers: [OportunidadesController, ClientsController],
      providers: [
        OportunidadesService,
        ClientsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: { create: async () => ({}) } },
        { provide: NotificationsService, useValue: {} },
        {
          provide: (await import('../users/users.service')).UsersService,
          useValue: {},
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context
            .switchToHttp()
            .getRequest<{ headers: Record<string, string>; user: object }>();
          req.user = {
            sub: 'vendedora',
            email: 'v@example.invalid',
            role: req.headers['x-role'] || 'COMERCIAL',
          };
          return true;
        },
      })
      .overrideGuard(AcessoCadastroGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    Object.assign(oportunidade, {
      stage: 'PROPOSTA',
      status: 'OPEN',
      lostReason: null,
      motivoPerda: null,
      observacaoPerda: null,
    });
    historico.mockClear();
  });
  it('catálogo possui 14 categorias e propriedades em português', async () => {
    const response = await request(app.getHttpServer())
      .get('/oportunidades/motivos-perda')
      .expect(200);
    const categorias = response.body as {
      codigo: string;
      rotulo: string;
      exigeObservacao: boolean;
    }[];
    expect(categorias).toHaveLength(14);
    expect(categorias.find((item) => item.codigo === 'OUTRO')).toEqual({
      codigo: 'OUTRO',
      rotulo: 'Outro motivo',
      exigeObservacao: true,
    });
  });
  it('não permite criar perdida sem motivo pela API', async () => {
    await request(app.getHttpServer())
      .post('/opportunities')
      .send({ clientId: clienteId, title: 'Proposta', stage: 'PERDIDO' })
      .expect(400);
  });
  it('não permite burlar obrigatoriedade pelas rotas de etapa ou status', async () => {
    await request(app.getHttpServer())
      .patch('/opportunities/o1/stage')
      .send({ stage: 'PERDIDO', lostReason: 'texto livre' })
      .expect(400);
    await request(app.getHttpServer())
      .patch('/oportunidades/o1/etapa')
      .send({ etapa: 'PERDIDO', motivoPerda: 'OUTRO', observacaoPerda: ' ' })
      .expect(400);
    await request(app.getHttpServer())
      .patch('/clients/' + clienteId + '/opportunities/o1/status')
      .send({ status: 'LOST', motivoPerda: 'LIMITACAO_OPERACIONAL' })
      .expect(400);
  });
  it('persiste pela rota de status, retorna detalhes e mantém histórico ao reabrir', async () => {
    const rota = '/clients/' + clienteId + '/opportunities/o1/status';
    await request(app.getHttpServer())
      .patch(rota)
      .send({
        status: 'LOST',
        motivoPerda: 'OUTRO',
        observacaoPerda: 'Projeto alterado pelo cliente',
      })
      .expect(200);
    const detalhe = await request(app.getHttpServer())
      .get('/opportunities/clients/' + clienteId + '/detail')
      .expect(200);
    expect(detalhe.body.opportunities[0]).toMatchObject({
      motivoPerda: 'OUTRO',
      observacaoPerda: 'Projeto alterado pelo cliente',
      status: 'LOST',
      stage: 'PERDIDO',
    });
    await request(app.getHttpServer())
      .patch(rota)
      .send({ status: 'OPEN' })
      .expect(200);
    expect(oportunidade).toMatchObject({
      motivoPerda: null,
      observacaoPerda: null,
      status: 'OPEN',
    });
    expect(historico.mock.calls[1][0]).toMatchObject({
      data: {
        createdById: 'vendedora',
        metadata: {
          motivoPerdaAnterior: 'OUTRO',
          observacaoPerdaAnterior: 'Projeto alterado pelo cliente',
        },
      },
    });
  });
  it('permite consultar perda legada sem atribuir motivo fictício', async () => {
    oportunidade.status = OpportunityStatus.LOST;
    oportunidade.lostReason = 'Registro de texto livre';
    const response = await request(app.getHttpServer())
      .get('/opportunities/clients/' + clienteId + '/detail')
      .expect(200);
    expect(response.body.opportunities[0]).toMatchObject({
      motivoPerda: null,
      lostReason: 'Registro de texto livre',
    });
  });
  it('preserva bloqueio de Marketing nas escritas comerciais', async () => {
    await request(app.getHttpServer())
      .patch('/opportunities/o1/stage')
      .set('x-role', 'MARKETING')
      .send({ stage: 'PERDIDO', motivoPerda: 'CONCORRENTE' })
      .expect(403);
  });
});
