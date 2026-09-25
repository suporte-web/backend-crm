import { Injectable } from '@nestjs/common';
import {
  MarketingIntegrationStatus,
  MarketingProvider,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

const supportedProviders = [
  MarketingProvider.GOOGLE_ANALYTICS,
  MarketingProvider.GOOGLE_ADS,
  MarketingProvider.META,
  MarketingProvider.LINKEDIN,
] as const;

type MarketingIntegrationRecord = {
  id: string;
  provider: MarketingProvider;
  status: MarketingIntegrationStatus;
  accountId: string | null;
  accountName: string | null;
  expiresAt: Date | null;
  metadata: Prisma.JsonValue | null;
  lastSyncAt: Date | null;
  lastError: string | null;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type MarketingIntegrationResponse = {
  id: string | null;
  provider: MarketingProvider;
  status: MarketingIntegrationStatus;
  accountId: string | null;
  accountName: string | null;
  expiresAt: Date | null;
  metadata: Prisma.JsonValue | null;
  lastSyncAt: Date | null;
  lastError: string | null;
  ativo: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
};

@Injectable()
export class MarketingIntegrationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<MarketingIntegrationResponse[]> {
    const integrations =
      await this.prisma.marketingIntegration.findMany({
        where: {
          provider: {
            in: [...supportedProviders],
          },
        },
        select: {
          id: true,
          provider: true,
          status: true,
          accountId: true,
          accountName: true,
          expiresAt: true,
          metadata: true,
          lastSyncAt: true,
          lastError: true,
          ativo: true,
          createdAt: true,
          updatedAt: true,
        },
      });

    const integrationsByProvider = new Map(
      integrations.map((integration) => [
        integration.provider,
        integration as MarketingIntegrationRecord,
      ]),
    );

    return supportedProviders.map((provider) => {
      const integration = integrationsByProvider.get(provider);

      if (!integration) {
        return {
          id: null,
          provider,
          status: MarketingIntegrationStatus.NAO_CONFIGURADO,
          accountId: null,
          accountName: null,
          expiresAt: null,
          metadata: null,
          lastSyncAt: null,
          lastError: null,
          ativo: false,
          createdAt: null,
          updatedAt: null,
        };
      }

      return {
        id: integration.id,
        provider: integration.provider,
        status: integration.status,
        accountId: integration.accountId,
        accountName: integration.accountName,
        expiresAt: integration.expiresAt,
        metadata: integration.metadata,
        lastSyncAt: integration.lastSyncAt,
        lastError: integration.lastError,
        ativo: integration.ativo,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt,
      };
    });
  }
}
