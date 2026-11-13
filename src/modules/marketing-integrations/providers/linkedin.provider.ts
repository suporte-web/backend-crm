import { Injectable } from '@nestjs/common';
import { MarketingProvider } from '@prisma/client';

@Injectable()
export class LinkedinProvider {
  readonly provider = MarketingProvider.LINKEDIN;
  readonly displayName = 'LinkedIn Ads';
}
