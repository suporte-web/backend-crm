import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TokenCipherService } from './token-cipher.service';
import { GoogleAnalyticsService } from './google-analytics.service';
import { GoogleAnalyticsController } from './google-analytics.controller';

import { PrismaModule } from '../prisma/prisma.module';
import { GoogleAdsProvider } from './providers/google-ads.provider';
import { GoogleAnalyticsProvider } from './providers/google-analytics.provider';
import { LinkedinProvider } from './providers/linkedin.provider';
import { MetaProvider } from './providers/meta.provider';
import { MarketingIntegrationsController } from './marketing-integrations.controller';
import { MarketingIntegrationsService } from './marketing-integrations.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [MarketingIntegrationsController, GoogleAnalyticsController],
  providers: [
    MarketingIntegrationsService,
    GoogleAnalyticsService,
    TokenCipherService,
    GoogleAnalyticsProvider,
    GoogleAdsProvider,
    MetaProvider,
    LinkedinProvider,
  ],
  exports: [MarketingIntegrationsService, GoogleAnalyticsService],
})
export class MarketingIntegrationsModule {}
