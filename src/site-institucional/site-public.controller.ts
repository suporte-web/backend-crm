import {
  Controller,
  Get,
  Param,
  Res,
} from '@nestjs/common';

import type { Response } from 'express';
import { SiteAssetsService } from './site-assets.service';

import { ApiTags } from '@nestjs/swagger';

import { SiteInstitucionalService } from './site-institucional.service';

@ApiTags('Site Institucional - Público')
@Controller('public/site')
export class SitePublicController {
  constructor(
  private readonly siteInstitucionalService:
    SiteInstitucionalService,

  private readonly siteAssetsService:
    SiteAssetsService,
) {}

  @Get('paginas/:slug')
  buscarPaginaPublicada(
    @Param('slug') slug: string,
  ) {
    return this.siteInstitucionalService.buscarPaginaPublicada(
      slug,
    );
  }
  @Get('assets/:slug/:fileName')
  async buscarImagem(
  @Param('slug') slug: string,
  @Param('fileName') fileName: string,
  @Res() response: Response,
  ) {
  const filePath =
    await this.siteAssetsService.localizarImagem(
      slug,
      fileName,
    );

  response.setHeader(
    'Cache-Control',
    'public, max-age=31536000, immutable',
  );

  return response.sendFile(filePath);
  }
}