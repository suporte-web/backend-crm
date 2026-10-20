import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CadastrosService } from './cadastros.service';
import { AlterarModalidadeDto, AtualizarEtapaCadastroDto, AtualizarFotoCadastroDto, CriarCadastroDto } from './dto/cadastro.dto';
import { LeadsService } from '../leads/leads.service';
import { UpdateLeadDto } from '../leads/dto/update-lead.dto';
import { CreateLeadObservacaoDto } from '../leads/dto/create-lead-observacao.dto';

@ApiTags('Cadastros')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cadastros')
export class CadastrosController {
  constructor(
    private readonly cadastros: CadastrosService,
    private readonly leads: LeadsService,
  ) {}

  @Get()
  listar(
    @CurrentUser() user: AuthUser,
    @Query('modalidade') tipo?: string,
    @Query('busca') busca?: string,
  ) {
    return this.cadastros.listar(user, tipo, busca);
  }

  @Post()
  criar(@CurrentUser() user: AuthUser, @Body() dto: CriarCadastroDto) {
    return this.cadastros.criar(user, dto);
  }

  @Get('lead/:id')
  resolverLead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.cadastros.resolverLead(user, id);
  }

  @Get(':id/lead')
  dadosLead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.cadastros.dadosLead(user, id);
  }

  @Patch(':id/lead')
  async atualizarLead(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    const lead = await this.cadastros.dadosLead(user, id);
    if (!lead)
      throw new NotFoundException(
        'Este cadastro não possui um lead vinculado.',
      );
    return this.leads.update(user, lead.id, dto);
  }

  @Post(':id/observacoes')
  async observacao(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateLeadObservacaoDto,
  ) {
    const lead = await this.cadastros.dadosLead(user, id);
    if (!lead)
      throw new NotFoundException(
        'Este cadastro não possui um lead vinculado.',
      );
    return this.leads.criarObservacao(user, lead.id, dto);
  }

  @Get(':id')
  obter(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.cadastros.obter(user, id);
  }

  @Patch(':id/modalidade')
  modalidade(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AlterarModalidadeDto,
  ) {
    return this.cadastros.alterarModalidade(user, id, dto);
  }

  @Patch(':id/etapa')
  atualizarEtapa(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: AtualizarEtapaCadastroDto) {
    return this.cadastros.atualizarEtapa(user, id, dto);
  }

  @Patch(':id/foto')
  atualizarFoto(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: AtualizarFotoCadastroDto) {
    return this.cadastros.atualizarFoto(user, id, dto.fotoUrl);
  }
}
