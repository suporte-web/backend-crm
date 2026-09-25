import { Injectable } from '@nestjs/common';
import { MarketingProvider } from '@prisma/client';

@Injectable()
export class GoogleAnalyticsProvider {
  readonly provider = MarketingProvider.GOOGLE_ANALYTICS;
  readonly displayName = 'Google Analytics 4';
}
