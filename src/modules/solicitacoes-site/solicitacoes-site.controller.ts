import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { CriarSolicitacaoSiteDto } from './dto/criar-solicitacao-site.dto';
import { ListarSolicitacoesSiteDto } from './dto/listar-solicitacoes-site.dto';

import { SolicitacoesSiteService } from './solicitacoes-site.service';

@Controller('integracoes/site/solicitacoes')
export class SolicitacoesSiteController {
  constructor(
    private readonly solicitacoesSiteService: SolicitacoesSiteService,
  ) {}

  @Post()
  criar(
    @Body()
    dto: CriarSolicitacaoSiteDto,
  ) {
    return this.solicitacoesSiteService.criar(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  listar(
    @Query()
    filtros: ListarSolicitacoesSiteDto,
  ) {
    return this.solicitacoesSiteService.listar(filtros);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  buscarPorId(
    @Param('id')
    id: string,
  ) {
    return this.solicitacoesSiteService.buscarPorId(id);
  }
}