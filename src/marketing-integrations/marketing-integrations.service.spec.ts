import { MarketingIntegrationStatus, MarketingProvider } from '@prisma/client';

import { MarketingIntegrationsService } from './marketing-integrations.service';

describe('MarketingIntegrationsService', () => {
  const prisma = {
    marketingIntegration: {
      findMany: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns all supported providers as not configured when there are no records', async () => {
    prisma.marketingIntegration.findMany.mockResolvedValue([]);

    const service = new MarketingIntegrationsService(prisma as never);

    await expect(service.findAll()).resolves.toEqual([
      expect.objectContaining({
        provider: MarketingProvider.GOOGLE_ANALYTICS,
        status: MarketingIntegrationStatus.NAO_CONFIGURADO,
        accountId: null,
        accountName: null,
      }),
      expect.objectContaining({
        provider: MarketingProvider.GOOGLE_ADS,
        status: MarketingIntegrationStatus.NAO_CONFIGURADO,
      }),
      expect.objectContaining({
        provider: MarketingProvider.META,
        status: MarketingIntegrationStatus.NAO_CONFIGURADO,
      }),
      expect.objectContaining({
        provider: MarketingProvider.LINKEDIN,
        status: MarketingIntegrationStatus.NAO_CONFIGURADO,
      }),
    ]);
  });

  it('does not expose encrypted tokens in configured integrations', async () => {
    prisma.marketingIntegration.findMany.mockResolvedValue([
      {
        id: 'integration-id',
        provider: MarketingProvider.GOOGLE_ANALYTICS,
        status: MarketingIntegrationStatus.CONECTADO,
        accountId: 'account-id',
        accountName: 'Pizzattolog GA4',
        accessTokenEncrypted: 'encrypted-access-token',
        refreshTokenEncrypted: 'encrypted-refresh-token',
        expiresAt: null,
        metadata: { propertyId: 'property-id' },
        lastSyncAt: null,
        lastError: null,
        ativo: true,
        createdAt: new Date('2026-09-23T10:00:00.000Z'),
        updatedAt: new Date('2026-09-23T10:00:00.000Z'),
      },
    ]);

    const service = new MarketingIntegrationsService(prisma as never);

    const [integration] = await service.findAll();

    expect(integration).toMatchObject({
      id: 'integration-id',
      provider: MarketingProvider.GOOGLE_ANALYTICS,
      status: MarketingIntegrationStatus.CONECTADO,
      accountId: 'account-id',
      accountName: 'Pizzattolog GA4',
      metadata: { propertyId: 'property-id' },
    });
    expect(integration).not.toHaveProperty('accessTokenEncrypted');
    expect(integration).not.toHaveProperty('refreshTokenEncrypted');
  });
});
