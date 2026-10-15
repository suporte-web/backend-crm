import {
  ExecutionContext,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import request from 'supertest';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

describe('Contrato HTTP de solicitações de exclusão de Leads', () => {
  let app: INestApplication;
  let actor: AuthUser;
  const leads = {
    findAll: jest.fn().mockResolvedValue([{ id: 'lead-real' }]),
    findOne: jest
      .fn()
      .mockRejectedValue(new NotFoundException('Lead não encontrado.')),
  };
  const exclusions = {
    listar: jest.fn().mockResolvedValue([]),
    solicitar: jest.fn().mockResolvedValue({ id: 'pedido' }),
    decidir: jest.fn().mockResolvedValue({ message: 'Solicitação recusada.' }),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [LeadsController],
      providers: [RolesGuard],
    })
      .useMocker((token) => (token === LeadsService ? leads : exclusions))
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          context.switchToHttp().getRequest<{ user: AuthUser }>().user = actor;
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    actor = { sub: 'comercial', email: 'c@crm.test', role: UserRole.COMERCIAL };
  });
  afterAll(async () => {
    await app.close();
  });

  it('lista Leads e a fila sem interpretar deletion-requests como ID de lead', async () => {
    await request(app.getHttpServer())
      .get('/api/leads?convertidoParaCliente=false')
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/leads/deletion-requests')
      .expect(200, []);
    expect(leads.findOne).not.toHaveBeenCalled();
    expect(exclusions.listar).toHaveBeenCalledWith(actor);
  });
  it('encaminha decisão ao serviço de Leads', async () => {
    await request(app.getHttpServer())
      .post('/api/leads/deletion-requests/pedido/decision')
      .send({ action: 'REJECT', message: 'Manter cadastro' })
      .expect(201);
    expect(exclusions.decidir).toHaveBeenCalledWith(actor, 'pedido', {
      action: 'REJECT',
      message: 'Manter cadastro',
    });
  });
  it('valida a decisão antes de processar', async () => {
    await request(app.getHttpServer())
      .post('/api/leads/deletion-requests/pedido/decision')
      .send({ action: 'DELETE' })
      .expect(400);
    expect(exclusions.decidir).not.toHaveBeenCalled();
  });
  it('Consultora solicita exclusão, mas não lista nem decide a fila', async () => {
    actor = { ...actor, role: UserRole.CONSULTORA };
    await request(app.getHttpServer())
      .post('/api/leads/lead-real/deletion-request')
      .send({ reason: 'Cadastro duplicado' })
      .expect(201);
    await request(app.getHttpServer())
      .get('/api/leads/deletion-requests')
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/leads/deletion-requests/pedido/decision')
      .send({ action: 'APPROVE' })
      .expect(403);
  });
  it('Marketing não consulta nem decide a fila', async () => {
    actor = { ...actor, role: UserRole.MARKETING };
    await request(app.getHttpServer())
      .get('/api/leads/deletion-requests')
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/leads/deletion-requests/pedido/decision')
      .send({ action: 'REJECT' })
      .expect(403);
  });
  it('mantém o 404 de detalhes para um lead realmente inexistente', async () => {
    await request(app.getHttpServer())
      .get('/api/leads/id-inexistente')
      .expect(404);
    expect(leads.findOne).toHaveBeenCalledWith(actor, 'id-inexistente');
  });
});
