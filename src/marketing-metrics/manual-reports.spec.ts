import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ManualReportsController } from './manual-reports.controller';
import { ManualReportsService } from './manual-reports.service';

describe('Manual GA4 reports HTTP', () => {
  let app: INestApplication<Server>;
  const id = '17a9d064-f50c-4f27-ae56-0af705292452';
  let saved: Record<string, unknown> | null = null;
  function select(
    record: Record<string, unknown> | null,
    fields: Record<string, boolean>,
  ) {
    return (
      record &&
      Object.fromEntries(
        Object.keys(fields)
          .filter((key) => fields[key])
          .map((key) => [key, record[key]]),
      )
    );
  }
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ManualReportsController],
      providers: [
        ManualReportsService,
        {
          provide: PrismaService,
          useValue: {
            marketingManualReport: {
              create: ({
                data,
                select: fields,
              }: {
                data: Record<string, unknown>;
                select: Record<string, boolean>;
              }) => {
                saved = { ...data, id, createdAt: new Date() };
                return Promise.resolve(select(saved, fields));
              },
              findMany: ({
                select: fields,
              }: {
                select: Record<string, boolean>;
              }) => Promise.resolve(saved ? [select(saved, fields)] : []),
              findUnique: ({
                where,
                select: fields,
              }: {
                where: { id: string };
                select: Record<string, boolean>;
              }) =>
                Promise.resolve(where.id === id ? select(saved, fields) : null),
            },
          },
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
  beforeEach(() => {
    saved = null;
  });
  afterAll(async () => app.close());
  const endpoint = '/api/marketing-metrics/manual-reports';
  const upload = (
    role = 'MARKETING',
    csv = 'Page,Views,Users\nHome,120,75',
    inicio = '2026-09-01',
  ) =>
    request(app.getHttpServer())
      .post(endpoint)
      .set('x-test-role', role)
      .field('title', 'Páginas')
      .field('propertyId', '283055240')
      .field('inicio', inicio)
      .field('fim', '2026-09-30')
      .attach('file', Buffer.from(csv), 'ga4.csv');

  it('persists the imported values and reopens them without a Google connection', async () => {
    const imported = await upload().expect(201);
    expect((imported.body as { data: unknown }).data).toEqual({
      columns: ['Page', 'Views', 'Users'],
      rows: [['Home', '120', '75']],
    });
    const list = await request(app.getHttpServer())
      .get(endpoint)
      .set('x-test-role', 'MARKETING')
      .expect(200);
    const summaries = list.body as Record<string, unknown>[];
    expect(summaries[0]).toMatchObject({
      id,
      title: 'Páginas',
      propertyId: '283055240',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      rowCount: 1,
    });
    expect(summaries[0]).not.toHaveProperty('data');
    expect(summaries[0]).not.toHaveProperty('importedBy');
    const reopened = await request(app.getHttpServer())
      .get(`${endpoint}/${id}`)
      .set('x-test-role', 'ADMIN')
      .expect(200);
    expect(reopened.body).toMatchObject({
      data: { rows: [['Home', '120', '75']] },
    });
  });
  it('rejects malformed CSV and invalid dates without saving a report', async () => {
    await upload('MARKETING', 'Page,Views\nHome,2,3').expect(400);
    await upload('MARKETING', 'Page,Views\nHome,2', '2026-02-30').expect(400);
    const list = await request(app.getHttpServer())
      .get(endpoint)
      .set('x-test-role', 'MARKETING')
      .expect(200);
    expect(list.body).toEqual([]);
  });
  it('rejects unauthorized reads and imports', async () => {
    await request(app.getHttpServer()).get(endpoint).expect(401);
    await request(app.getHttpServer())
      .get(endpoint)
      .set('x-test-role', 'COMERCIAL')
      .expect(403);
    await upload('COMERCIAL').expect(403);
  });
  it('returns 404 for a missing report and rejects missing files', async () => {
    await request(app.getHttpServer())
      .get(`${endpoint}/${id}`)
      .set('x-test-role', 'ADMIN')
      .expect(404);
    await request(app.getHttpServer())
      .post(endpoint)
      .set('x-test-role', 'ADMIN')
      .send({
        title: 'Páginas',
        propertyId: '283055240',
        inicio: '2026-09-01',
        fim: '2026-09-30',
      })
      .expect(400);
  });
});
