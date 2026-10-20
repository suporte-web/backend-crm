import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CotacaoSiteTriagemService } from './cotacao-site-triagem.service';
import { EncaminharCotacaoSiteDto, ReprovarCotacaoSiteDto } from './dto/triagem-cotacao-site.dto';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import type { Response } from 'express';
import { existsSync } from 'fs';
import { extname, join } from 'path';

import { FilesInterceptor } from '@nestjs/platform-express';

import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { CriarSolicitacaoSiteDto } from './dto/criar-solicitacao-site.dto';
import { ListarSolicitacoesSiteDto } from './dto/listar-solicitacoes-site.dto';

import { SolicitacoesSiteService } from './solicitacoes-site.service';

const diretorioAnexos =
  process.env.SOLICITACOES_SITE_UPLOAD_DIR ??
  join(process.cwd(), 'uploads', 'solicitacoes-site');

mkdirSync(diretorioAnexos, {
  recursive: true,
});

@Controller('integracoes/site/solicitacoes')
export class SolicitacoesSiteController {
  constructor(
    private readonly solicitacoesSiteService: SolicitacoesSiteService,
    private readonly triagem: CotacaoSiteTriagemService,
  ) {}

  @Post()
  criar(
    @Body()
    dto: CriarSolicitacaoSiteDto,
  ) {
    return this.solicitacoesSiteService.criar(dto);
  }

  @Post(':id/anexos')
  @UseInterceptors(
    FilesInterceptor('arquivos', 5, {
      storage: diskStorage({
        destination: diretorioAnexos,

        filename: (_request, file, callback) => {
          const extensao = extname(file.originalname).toLowerCase();

          const nomeArquivo = `${randomUUID()}${extensao}`;

          callback(null, nomeArquivo);
        },
      }),

      limits: {
        fileSize: 10 * 1024 * 1024,
      },

      fileFilter: (_request, file, callback) => {
        const tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/png',
          'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

        if (!tiposPermitidos.includes(file.mimetype)) {
          callback(
            new Error('Tipo de arquivo não permitido. Envie PDF, JPG, PNG ou Excel (.xls e .xlsx).'),
            false,
          );

          return;
        }

        callback(null, true);
      },
    }),
  )
  adicionarAnexos(
    @Param('id')
    id: string,

    @UploadedFiles()
    arquivos: Express.Multer.File[],
  ) {
    return this.solicitacoesSiteService.adicionarAnexos(id, arquivos);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  listar(
    @Query()
    filtros: ListarSolicitacoesSiteDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.solicitacoesSiteService.listar(filtros, user);
  }

  @Get('responsaveis-comerciais')
  @UseGuards(JwtAuthGuard)
  responsaveis(@CurrentUser() user: AuthUser) {
    return this.triagem.responsaveis(user);
  }

  @Post(':id/direcionar')
  @UseGuards(JwtAuthGuard)
  encaminhar(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: EncaminharCotacaoSiteDto) {
    return this.triagem.encaminhar(user, id, dto);
  }

  @Post(':id/reprovar')
  @UseGuards(JwtAuthGuard)
  reprovar(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ReprovarCotacaoSiteDto) {
    return this.triagem.reprovar(user, id, dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  buscarPorId(
    @Param('id')
    id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.solicitacoesSiteService.buscarPorId(id, user);
  }
  @Get(':id/anexos/:anexoId/download')
  @UseGuards(JwtAuthGuard)
  async baixarAnexo(
    @Param('id') id: string,
    @Param('anexoId') anexoId: string,
    @Res() res: Response,
  ) {
    const anexo = await this.solicitacoesSiteService.buscarAnexo(id, anexoId);

    const caminhoArquivo = join(diretorioAnexos, anexo.nomeArquivo);

    if (!existsSync(caminhoArquivo)) {
      return res.status(404).json({
        message: 'Arquivo não encontrado no servidor.',
      });
    }

    return res.download(caminhoArquivo, anexo.nomeArquivoOriginal);
  }
}
