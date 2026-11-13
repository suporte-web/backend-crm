import { Injectable } from '@nestjs/common';
import { MarketingProvider } from '@prisma/client';

@Injectable()
export class GoogleAdsProvider {
  readonly provider = MarketingProvider.GOOGLE_ADS;
  readonly displayName = 'Google Ads';
}
