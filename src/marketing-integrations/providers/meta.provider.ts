import { Injectable } from '@nestjs/common';
import { MarketingProvider } from '@prisma/client';

@Injectable()
export class MetaProvider {
  readonly provider = MarketingProvider.META;
  readonly displayName = 'Meta Ads';
}
