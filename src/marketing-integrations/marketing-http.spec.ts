import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { GoogleAnalyticsController } from './google-analytics.controller';
import { GoogleAnalyticsService } from './google-analytics.service';
import { GoogleAnalyticsProvider } from './providers/google-analytics.provider';
import { MarketingMetricsController } from '../marketing-metrics/marketing-metrics.controller';
import { MarketingMetricsService } from '../marketing-metrics/marketing-metrics.service';

describe('Marketing HTTP boundaries', () => {
  let app: INestApplication<Server>;
  const analytics = {
    connect: jest.fn().mockResolvedValue({
      url: 'http://localhost:3001/api/marketing-integrations/google/authorize?ticket=test',
    }),
    authorize: jest.fn().mockResolvedValue({
      browser: 'opaque-browser-nonce',
      url: 'https://accounts.google.com/o/oauth2/v2/auth?state=test',
    }),
    callback: jest.fn().mockResolvedValue('selecione'),
    frontendRedirect: (outcome: string) =>
      `http://localhost:3000/marketing/integracoes?google=${outcome}`,
    properties: jest.fn().mockResolvedValue({ pending: false, properties: [] }),
    selectProperty: jest.fn().mockResolvedValue({ message: 'Conectado.' }),
    test: jest.fn().mockResolvedValue({ message: 'Conexão testada.' }),
    disconnect: jest.fn().mockResolvedValue({ message: 'Desconectado.' }),
  };
  const metrics = {
    resumo: jest.fn().mockResolvedValue({}),
    trafego: jest.fn().mockResolvedValue([]),
    paginas: jest.fn().mockResolvedValue([]),
    eventos: jest.fn().mockResolvedValue([]),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [GoogleAnalyticsController, MarketingMetricsController],
      providers: [
        { provide: GoogleAnalyticsService, useValue: analytics },
        { provide: MarketingMetricsService, useValue: metrics },
        {
          provide: GoogleAnalyticsProvider,
          useValue: new GoogleAnalyticsProvider(
            new ConfigService({
              GOOGLE_CLIENT_ID: 'test',
              GOOGLE_CLIENT_SECRET: 'secret',
              GOOGLE_REDIRECT_URI:
                'http://localhost:3001/api/marketing-integrations/google/callback',
              MARKETING_FRONTEND_URL: 'http://localhost:3000',
            }),
          ),
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest<{
            headers: Record<string, string>;
            user?: { sub: string; role: string };
          }>();
          if (!req.headers['x-test-role']) throw new UnauthorizedException();
          req.user = {
            sub: 'marketing-user',
            role: req.headers['x-test-role'],
          };
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
  afterAll(async () => app.close());

  it.each([
    ['get', '/marketing-integrations/google/connect'],
    ['get', '/marketing-integrations/google-analytics/properties'],
    ['post', '/marketing-integrations/google-analytics/select-property'],
    ['post', '/marketing-integrations/google-analytics/test'],
    ['delete', '/marketing-integrations/google-analytics'],
    ['get', '/marketing-metrics/resumo'],
    ['get', '/marketing-metrics/trafego'],
    ['get', '/marketing-metrics/paginas'],
    ['get', '/marketing-metrics/eventos'],
  ] as const)(
    'requires JWT and marketing/admin role for %s %s',
    async (method, path) => {
      await request(app.getHttpServer())[method](`/api${path}`).expect(401);
      await request(app.getHttpServer())
        [method](`/api${path}`)
        .set('x-test-role', 'COMERCIAL')
        .expect(403);
    },
  );

  it('binds OAuth launch with HttpOnly cookie and no-referrer redirects', async () => {
    const response = await request(app.getHttpServer())
      .get(
        `/api/marketing-integrations/google/authorize?ticket=${'a'.repeat(43)}`,
      )
      .expect(302);
    const cookies = response.headers['set-cookie'] as unknown as string[];
    expect(cookies.join(' ')).toContain('HttpOnly');
    expect(cookies.join(' ')).toContain('SameSite=Lax');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('callback does not require browser JWT and never redirects codes or tokens to frontend', async () => {
    const response = await request(app.getHttpServer())
      .get(
        `/api/marketing-integrations/google/callback?state=${'a'.repeat(43)}&code=private-code`,
      )
      .set('Cookie', 'marketing_google_oauth=opaque-browser-nonce')
      .expect(302);
    expect(response.headers.location).toBe(
      'http://localhost:3000/marketing/integracoes?google=selecione',
    );
    expect(response.headers.location).not.toMatch(/private-code|token/);
    expect(analytics.callback).toHaveBeenCalledWith(
      'a'.repeat(43),
      'opaque-browser-nonce',
      'private-code',
      undefined,
    );
  });

  it('invalid callback safely redirects and selection rejects tampered fields', async () => {
    const response = await request(app.getHttpServer())
      .get(
        '/api/marketing-integrations/google/callback?state=invalid&code=private-code',
      )
      .expect(302);
    expect(response.headers.location).toContain('google=erro');
    expect(analytics.callback).not.toHaveBeenCalled();
    await request(app.getHttpServer())
      .post('/api/marketing-integrations/google-analytics/select-property')
      .set('x-test-role', 'MARKETING')
      .send({ propertyId: '../../another-resource' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/marketing-integrations/google-analytics/select-property')
      .set('x-test-role', 'MARKETING')
      .send({ propertyId: '123', access_token: 'tampered' })
      .expect(400);
    expect(analytics.selectProperty).not.toHaveBeenCalled();
    await request(app.getHttpServer())
      .post('/api/marketing-integrations/google-analytics/select-property')
      .set('x-test-role', 'MARKETING')
      .send({ propertyId: '123' })
      .expect(201);
    expect(analytics.selectProperty).toHaveBeenCalledWith(
      'marketing-user',
      '123',
    );
  });

  it('validates period DTO before requesting upstream metrics', async () => {
    await request(app.getHttpServer())
      .get('/api/marketing-metrics/resumo?periodo=invalid')
      .set('x-test-role', 'MARKETING')
      .expect(400);
    expect(metrics.resumo).not.toHaveBeenCalled();
    await request(app.getHttpServer())
      .get('/api/marketing-metrics/resumo?periodo=7')
      .set('x-test-role', 'ADMIN')
      .expect(200);
    expect(metrics.resumo).toHaveBeenCalledWith(
      expect.objectContaining({ periodo: '7' }),
    );
  });
});
