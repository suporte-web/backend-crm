/* eslint-disable @typescript-eslint/unbound-method -- Jest inspects mocked methods without invoking them. */
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import type {
  MarketingIntegration,
  MarketingOAuthSession,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { PrismaService } from '../prisma/prisma.service';
import { GoogleAnalyticsService, hashOAuth } from './google-analytics.service';
import { GoogleApiError, GoogleTokens, ReportQuery } from './google-api.types';
import { GoogleAnalyticsProvider } from './providers/google-analytics.provider';
import { TokenCipherService } from './token-cipher.service';
import { publicMarketingMetadata } from './marketing-integrations.service';

const configuration: Record<string, string> = {
  GOOGLE_CLIENT_ID: 'test-client',
  GOOGLE_CLIENT_SECRET: 'test-secret',
  GOOGLE_REDIRECT_URI:
    'http://localhost:3001/api/marketing-integrations/google/callback',
  GOOGLE_OAUTH_AUTHORIZE_URL: 'https://accounts.google.com/o/oauth2/v2/auth',
  GOOGLE_OAUTH_TOKEN_URL: 'https://oauth2.googleapis.com/token',
  GOOGLE_OAUTH_REVOKE_URL: 'https://oauth2.googleapis.com/revoke',
  GOOGLE_ANALYTICS_ADMIN_API_URL:
    'https://analyticsadmin.googleapis.com/v1beta',
  GOOGLE_ANALYTICS_DATA_API_URL: 'https://analyticsdata.googleapis.com/v1beta',
  MARKETING_FRONTEND_URL: 'http://localhost:3000',
  MARKETING_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
};
const config = new ConfigService(configuration);
const cipher = new TokenCipherService(config);
const tokens: GoogleTokens = {
  access_token: 'private-access',
  refresh_token: 'private-refresh',
  expires_in: 3600,
};
const property = {
  propertyId: '123',
  propertyName: 'Pizzattolog',
  accountId: '456',
  accountName: 'Conta Pizzattolog',
};

describe('Google Analytics authorization lifecycle', () => {
  let sessions: MarketingOAuthSession[];
  let integration: MarketingIntegration | null;
  let google: GoogleAnalyticsProvider;
  let service: GoogleAnalyticsService;
  let prisma: {
    marketingOAuthSession: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      updateMany: jest.Mock;
      deleteMany: jest.Mock;
    };
    marketingIntegration: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      upsert: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    sessions = [];
    integration = null;
    const snapshot = () => (integration ? { ...integration } : null);
    prisma = {
      marketingOAuthSession: {
        create: jest.fn(
          ({ data }: { data: Partial<MarketingOAuthSession> }) => {
            const session = {
              id: randomUUID(),
              browserHash: null,
              startedAt: null,
              consumedAt: null,
              accessTokenEncrypted: null,
              refreshTokenEncrypted: null,
              tokenExpiresAt: null,
              createdAt: new Date(),
              ...data,
            } as MarketingOAuthSession;
            sessions.push(session);
            return Promise.resolve({ ...session });
          },
        ),
        findUnique: jest.fn(({ where }: { where: { stateHash: string } }) =>
          Promise.resolve(
            sessions.find((session) => session.stateHash === where.stateHash) ??
              null,
          ),
        ),
        findFirst: jest.fn(({ where }: { where: { userId: string } }) =>
          Promise.resolve(
            sessions.find(
              (session) =>
                session.userId === where.userId &&
                session.accessTokenEncrypted &&
                session.consumedAt &&
                session.expiresAt > new Date(),
            ) ?? null,
          ),
        ),
        updateMany: jest.fn(
          ({
            where,
            data,
          }: {
            where: { id: string; startedAt?: null; consumedAt?: null };
            data: Partial<MarketingOAuthSession>;
          }) => {
            const session = sessions.find(
              (item) =>
                item.id === where.id &&
                (where.startedAt !== null || !item.startedAt) &&
                (where.consumedAt !== null || !item.consumedAt),
            );
            if (!session) return Promise.resolve({ count: 0 });
            Object.assign(session, data);
            return Promise.resolve({ count: 1 });
          },
        ),
        deleteMany: jest.fn(
          ({
            where,
          }: {
            where: {
              id?: string;
              userId?: string;
              expiresAt?: { lt: Date };
              OR?: unknown[];
            };
          }) => {
            const original = sessions.length;
            sessions = sessions.filter((session) =>
              where.id
                ? session.id !== where.id
                : where.expiresAt
                  ? session.expiresAt >= where.expiresAt.lt
                  : where.OR
                    ? false
                    : false,
            );
            return Promise.resolve({ count: original - sessions.length });
          },
        ),
      },
      marketingIntegration: {
        findUnique: jest.fn(() => Promise.resolve(snapshot())),
        findUniqueOrThrow: jest.fn(() => Promise.resolve(snapshot())),
        upsert: jest.fn(
          ({
            create,
            update,
          }: {
            create: Partial<MarketingIntegration>;
            update: Partial<MarketingIntegration>;
          }) => {
            integration = integration
              ? { ...integration, ...update }
              : ({
                  id: 'integration',
                  accountId: null,
                  accountName: null,
                  accessTokenEncrypted: null,
                  refreshTokenEncrypted: null,
                  expiresAt: null,
                  metadata: null,
                  lastSyncAt: null,
                  lastError: null,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  ...create,
                } as MarketingIntegration);
            return Promise.resolve(snapshot());
          },
        ),
        updateMany: jest.fn(
          ({
            where,
            data,
          }: {
            where: {
              ativo?: boolean;
              accessTokenEncrypted?: string | null;
              status?: string;
            };
            data: Partial<MarketingIntegration>;
          }) => {
            if (
              !integration ||
              (where.ativo !== undefined &&
                integration.ativo !== where.ativo) ||
              (where.accessTokenEncrypted !== undefined &&
                integration.accessTokenEncrypted !==
                  where.accessTokenEncrypted) ||
              (where.status && integration.status !== where.status)
            )
              return Promise.resolve({ count: 0 });
            Object.assign(integration, data);
            return Promise.resolve({ count: 1 });
          },
        ),
      },
      $transaction: jest.fn((run: (tx: unknown) => Promise<unknown>) =>
        run(prisma),
      ),
    };
    google = new GoogleAnalyticsProvider(config);
    jest.spyOn(google, 'exchange').mockResolvedValue(tokens);
    jest.spyOn(google, 'properties').mockResolvedValue([property]);
    jest.spyOn(google, 'report').mockResolvedValue({ rows: [] });
    jest
      .spyOn(google, 'refresh')
      .mockResolvedValue({ ...tokens, access_token: 'renewed-access' });
    jest.spyOn(google, 'revoke').mockResolvedValue(true);
    service = new GoogleAnalyticsService(
      prisma as unknown as PrismaService,
      google,
      cipher,
    );
  });

  async function authorized() {
    const result = await service.connect('marketing-user');
    const ticket = new URL(result.url).searchParams.get('ticket')!;
    const authorization = await service.authorize(ticket);
    await service.callback(ticket, authorization.browser, 'authorization-code');
    return { ticket, browser: authorization.browser };
  }

  async function connected() {
    await authorized();
    await service.selectProperty('marketing-user', '123');
  }

  it('stores hashed state and encrypted verifier, binds browser and returns no tokens', async () => {
    const result = await service.connect('marketing-user');
    const state = new URL(result.url).searchParams.get('ticket')!;
    expect(sessions[0].stateHash).toBe(hashOAuth(state));
    expect(sessions[0].codeVerifierEncrypted).toMatch(/^v1\./);
    const start = await service.authorize(state);
    const authorization = new URL(start.url);
    expect(authorization.searchParams.get('code_challenge_method')).toBe(
      'S256',
    );
    expect(authorization.searchParams.get('scope')).toContain(
      'analytics.readonly',
    );
    expect(sessions[0].browserHash).toBe(hashOAuth(start.browser));
    expect(JSON.stringify(result)).not.toMatch(
      /test-secret|private-access|private-refresh/,
    );
    await expect(service.authorize(state)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects wrong browser, expired state and replay without exchanging codes', async () => {
    const result = await service.connect('marketing-user');
    const state = new URL(result.url).searchParams.get('ticket')!;
    const start = await service.authorize(state);
    await expect(
      service.callback(state, 'another-browser', 'code'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(google.exchange).not.toHaveBeenCalled();
    sessions[0].expiresAt = new Date(0);
    await expect(
      service.callback(state, start.browser, 'code'),
    ).rejects.toBeInstanceOf(BadRequestException);
    sessions[0].expiresAt = new Date(Date.now() + 60000);
    await service.callback(state, start.browser, 'code');
    await expect(
      service.callback(state, start.browser, 'code'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(google.exchange).toHaveBeenCalledTimes(1);
  });

  it('keeps authorization private until authorized user selects an available property', async () => {
    await authorized();
    expect(integration?.status).toBe('CONECTANDO');
    expect(integration?.accessTokenEncrypted).toBeNull();
    expect(sessions[0].accessTokenEncrypted).not.toContain('private-access');
    await expect(service.properties('another-user')).resolves.toEqual({
      pending: false,
      properties: [],
    });
    await expect(
      service.selectProperty('another-user', '123'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.selectProperty('marketing-user', '999'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await service.selectProperty('marketing-user', '123');
    expect(integration).toMatchObject({
      status: 'CONECTADO',
      ativo: true,
      accountId: '456',
      metadata: { propertyId: '123', propertyName: 'Pizzattolog' },
    });
    expect(cipher.decrypt(integration!.refreshTokenEncrypted!)).toBe(
      'private-refresh',
    );
    expect(sessions).toHaveLength(0);
    expect(google.report).toHaveBeenCalled();
  });

  it('refreshes expired access token automatically and coalesces simultaneous refresh', async () => {
    await connected();
    integration!.expiresAt = new Date(0);
    const query: ReportQuery = {
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      metrics: [{ name: 'sessions' }],
    };
    await Promise.all([service.report(query), service.report(query)]);
    expect(google.refresh).toHaveBeenCalledTimes(1);
    expect(cipher.decrypt(integration!.accessTokenEncrypted!)).toBe(
      'renewed-access',
    );
    expect(integration?.status).toBe('CONECTADO');
  });

  it('marks revoked authorization expired with a safe message', async () => {
    await connected();
    integration!.expiresAt = new Date(0);
    jest
      .mocked(google.refresh)
      .mockRejectedValue(new GoogleApiError(400, true));
    await expect(service.test()).rejects.toThrow('A autorização expirou');
    expect(integration?.status).toBe('EXPIRADO');
    expect(integration?.lastError).not.toMatch(
      /private-access|private-refresh|test-secret/,
    );
  });

  it('disconnect clears credentials and pending sessions even when revocation fails', async () => {
    await connected();
    await service.connect('marketing-user');
    jest.mocked(google.revoke).mockResolvedValue(false);
    await service.disconnect();
    expect(integration).toMatchObject({
      status: 'NAO_CONFIGURADO',
      ativo: false,
      accessTokenEncrypted: null,
      refreshTokenEncrypted: null,
      accountId: null,
      metadata: {},
    });
    expect(sessions).toHaveLength(0);
    expect(google.revoke).toHaveBeenCalledWith('private-refresh');
  });

  it('does not resurrect a disconnected integration during an in-flight refresh', async () => {
    await connected();
    integration!.expiresAt = new Date(0);
    let release!: (value: GoogleTokens) => void;
    let signalStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      signalStarted = resolve;
    });
    jest.mocked(google.refresh).mockImplementation(() => {
      signalStarted();
      return new Promise<GoogleTokens>((resolve) => {
        release = resolve;
      });
    });
    const report = service.test();
    await started;
    await service.disconnect();
    release({ ...tokens, access_token: 'must-not-be-saved' });
    await expect(report).rejects.toThrow('desconectada');
    expect(integration).toMatchObject({
      status: 'NAO_CONFIGURADO',
      ativo: false,
      accessTokenEncrypted: null,
      refreshTokenEncrypted: null,
    });
  });

  it('does not overwrite an existing connection when new consent is denied', async () => {
    await connected();
    const access = integration?.accessTokenEncrypted;
    const result = await service.connect('marketing-user');
    const state = new URL(result.url).searchParams.get('ticket')!;
    const start = await service.authorize(state);
    await expect(
      service.callback(state, start.browser, undefined, 'access_denied'),
    ).resolves.toBe('cancelado');
    expect(integration?.accessTokenEncrypted).toBe(access);
    expect(integration?.status).toBe('CONECTADO');
  });
});

describe('credential boundaries', () => {
  it('encrypts with random IV, authenticates ciphertext and rejects a different key', () => {
    const one = cipher.encrypt('sensitive-token');
    const two = cipher.encrypt('sensitive-token');
    expect(one).not.toBe(two);
    expect(cipher.decrypt(one)).toBe('sensitive-token');
    const parts = one.split('.');
    parts[2] = Buffer.alloc(16).toString('base64url');
    expect(() => cipher.decrypt(parts.join('.'))).toThrow();
    const wrong = new TokenCipherService(
      new ConfigService({
        MARKETING_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 8).toString('base64'),
      }),
    );
    expect(() => wrong.decrypt(one)).toThrow();
  });

  it('allows only public property fields in metadata', () => {
    expect(
      publicMarketingMetadata({
        propertyId: '123',
        propertyName: 'Pizzattolog',
        accessToken: 'secret',
        refresh_token: 'secret',
        nested: { privateKey: 'secret' },
      }),
    ).toEqual({ propertyId: '123', propertyName: 'Pizzattolog' });
  });

  it('does not require Google credentials merely to instantiate provider', () => {
    const provider = new GoogleAnalyticsProvider(new ConfigService({}));
    expect(() => provider.settings()).toThrow('configurado');
  });
});
