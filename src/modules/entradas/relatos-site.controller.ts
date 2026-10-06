import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IntegracaoInformativoGuard as IntegracaoSiteGuard } from '../informativo/guards/integracao-informativo.guard';
import { RegistrarRelatoDto } from './dto/registrar-relato.dto';
import { RelatosSiteService } from './relatos-site.service';

@Controller('atendimentos/site/relatos')
export class RelatosSiteController {
  constructor(private readonly relatos: RelatosSiteService) {}
  @Post()
  @UseGuards(IntegracaoSiteGuard)
  @UseInterceptors(
    FilesInterceptor('arquivos', 5, {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024, fields: 12, fieldSize: 20000 },
    }),
  )
  registrar(
    @Body() dto: RegistrarRelatoDto,
    @UploadedFiles() arquivos: Express.Multer.File[],
  ) {
    return this.relatos.registrar(dto, arquivos);
  }
  @Get(':ticketId/anexos/:anexoId')
  @UseGuards(JwtAuthGuard)
  async baixar(
    @CurrentUser() user: { sub: string; role: string },
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Param('anexoId', ParseUUIDPipe) anexoId: string,
    @Res() res: Response,
  ) {
    const anexo = await this.relatos.baixar(user, ticketId, anexoId);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', anexo.tipo);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="anexo"; filename*=UTF-8''${encodeURIComponent(anexo.nome)}`,
    );
    res.send(anexo.conteudo);
  }
}
