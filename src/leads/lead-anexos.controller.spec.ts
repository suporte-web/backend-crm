import { ExecutionContext, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { LeadAnexosController } from './lead-anexos.controller';
import { LeadAnexosService } from './lead-anexos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('API privada de anexos dos Leads', () => {
  let app: any;
  const id = randomUUID();
  const anexos = {
    listar: jest.fn().mockResolvedValue([]),
    anexar: jest.fn().mockResolvedValue({ id: randomUUID() }),
    baixar: jest
      .fn()
      .mockResolvedValue({
        nome: 'evidência.pdf',
        tipo: 'application/pdf',
        buffer: Buffer.from('%PDF-teste'),
      }),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [LeadAnexosController],
      providers: [{ provide: LeadAnexosService, useValue: anexos }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          const req = ctx.switchToHttp().getRequest();
          req.user = {
            sub: randomUUID(),
            role: req.headers['x-test-role'] || 'COMERCIAL',
          };
          return true;
        },
      })
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
  it('recebe arquivo multipart e comentário sem exigir etapa', async () => {
    await request(app.getHttpServer())
      .post(`/leads/${id}/anexos`)
      .field('comentario', ' comentário ')
      .attach('arquivo', Buffer.from('%PDF-teste'), 'teste.pdf')
      .expect(201);
    expect(anexos.anexar).toHaveBeenCalledWith(
      expect.anything(),
      id,
      expect.objectContaining({
        originalname: 'teste.pdf',
        buffer: expect.any(Buffer),
      }),
      'comentário',
    );
  });
  it('nega perfis externos', async () => {
    await request(app.getHttpServer())
      .get(`/leads/${id}/anexos`)
      .set('x-test-role', 'CLIENTE')
      .expect(403);
  });
  it('valida comentário antes de persistir', async () => {
    await request(app.getHttpServer())
      .post(`/leads/${id}/anexos`)
      .field('comentario', 'x'.repeat(1001))
      .attach('arquivo', Buffer.from('%PDF-teste'), 'teste.pdf')
      .expect(400);
  });
  it('rejeita identificador inválido', async () => {
    await request(app.getHttpServer())
      .get('/leads/invalido/anexos')
      .expect(400);
  });
  it('baixa o arquivo autenticado com cabeçalhos privados', async () => {
    const response = await request(app.getHttpServer())
      .get(`/leads/${id}/anexos/${randomUUID()}`)
      .expect(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['content-disposition']).toContain('attachment;');
  });
});
