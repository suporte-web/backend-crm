import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CriarOportunidadeDto } from './dto/criar-oportunidade.dto';
import { AtualizarOportunidadeDto } from './dto/atualizar-oportunidade.dto';
import { AtualizarEtapaOportunidadeDto } from './dto/atualizar-etapa-oportunidade.dto';
import { OportunidadesService } from './oportunidades.service';

@ApiTags('Oportunidades')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL)
@Controller(['oportunidades', 'opportunities'])
export class OportunidadesController {
  constructor(private readonly oportunidadesService: OportunidadesService) {}

  @Post()
  criar(@CurrentUser() user: AuthUser, @Body() dto: CriarOportunidadeDto) {
    return this.oportunidadesService.criar(user, dto);
  }

  @ApiQuery({ name: 'clienteId', required: false, type: String })
  @ApiQuery({ name: 'etapa', required: false, type: String })
  @ApiQuery({ name: 'situacao', required: false, type: String })
  @Get()
  listar(
    @CurrentUser() usuario: AuthUser,
    @Query() consulta: Record<string, string | undefined>,
  ) {
    return this.oportunidadesService.listar(usuario, {
      clienteId: consulta.clienteId ?? consulta.clientId,
      etapa: consulta.etapa ?? consulta.stage,
      situacao: consulta.situacao ?? consulta.status,
      modalidadeCadastro: consulta.modalidade,
    });
  }

  @Patch([':id/etapa', ':id/stage'])
  atualizarEtapa(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AtualizarEtapaOportunidadeDto,
  ) {
    if (!id) {
      throw new BadRequestException(
        'O identificador da oportunidade é obrigatório.',
      );
    }

    return this.oportunidadesService.atualizarEtapa(user, id, dto);
  }

  @Patch(':id')
  atualizar(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AtualizarOportunidadeDto,
  ) {
    if (!id) {
      throw new BadRequestException(
        'O identificador da oportunidade é obrigatório.',
      );
    }

    return this.oportunidadesService.atualizar(user, id, dto);
  }

  @Delete(':id')
  excluir(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    if (!id) {
      throw new BadRequestException(
        'O identificador da oportunidade é obrigatório.',
      );
    }

    return this.oportunidadesService.excluir(user, id);
  }
}
