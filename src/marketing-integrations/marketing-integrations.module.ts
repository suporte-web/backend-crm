import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { GoogleAdsProvider } from './providers/google-ads.provider';
import { GoogleAnalyticsProvider } from './providers/google-analytics.provider';
import { LinkedinProvider } from './providers/linkedin.provider';
import { MetaProvider } from './providers/meta.provider';
import { MarketingIntegrationsController } from './marketing-integrations.controller';
import { MarketingIntegrationsService } from './marketing-integrations.service';

@Module({
  imports: [PrismaModule],
  controllers: [MarketingIntegrationsController],
  providers: [
    MarketingIntegrationsService,
    GoogleAnalyticsProvider,
    GoogleAdsProvider,
    MetaProvider,
    LinkedinProvider,
  ],
  exports: [MarketingIntegrationsService],
})
export class MarketingIntegrationsModule {}
