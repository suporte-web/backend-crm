import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';

import {
  SiteAssetsService,
  SiteUploadFile,
} from './site-assets.service';


import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';

import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { SalvarRascunhoSiteDto } from './dto/salvar-rascunho-site.dto';
import { SiteInstitucionalService } from './site-institucional.service';

@ApiTags('Site Institucional')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('site-institucional')
export class SiteInstitucionalController {
  constructor(
  private readonly siteInstitucionalService:
    SiteInstitucionalService,

  private readonly siteAssetsService:
    SiteAssetsService,
) {}


@UseGuards(RolesGuard)
@Roles(
  UserRole.ADMIN,
  UserRole.MARKETING,
)
@Post('paginas/:slug/upload')
@UseInterceptors(
  FileInterceptor('file', {
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
  }),
)
uploadImagem(
  @Param('slug') slug: string,

  @UploadedFile()
  file?: SiteUploadFile,
) {
  return this.siteAssetsService.salvarImagem(
    slug,
    file,
  );
}


  @UseGuards(RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.MARKETING,
  )
  @Get('paginas/:slug')
  buscarPagina(
    @Param('slug') slug: string,
  ) {
    return this.siteInstitucionalService.buscarPagina(slug);
  }

  @UseGuards(RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.MARKETING,
  )
  @Patch('paginas/:slug/rascunho')
  salvarRascunho(
    @Param('slug') slug: string,
    @Body() dto: SalvarRascunhoSiteDto,
  ) {
    return this.siteInstitucionalService.salvarRascunho(
      slug,
      dto.nome,
      dto.conteudo as Prisma.InputJsonValue,
    );
  }

  @UseGuards(RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.MARKETING,
  )
  @Post('paginas/:slug/publicar')
  publicar(
    @Param('slug') slug: string,
  ) {
    return this.siteInstitucionalService.publicar(slug);
  }
}