import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';

import { SiteInstitucionalController } from './site-institucional.controller';
import { SitePublicController } from './site-public.controller';
import { SiteInstitucionalService } from './site-institucional.service';
import { SiteAssetsService } from './site-assets.service';


@Module({
  imports: [
    PrismaModule,
  ],

  controllers: [
    SiteInstitucionalController,
    SitePublicController,
  ],

  providers: [
    SiteInstitucionalService,
    SiteAssetsService,
  ],

  exports: [
    SiteInstitucionalService,
  ],
})
export class SiteInstitucionalModule {}