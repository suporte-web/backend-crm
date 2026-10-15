import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FiltrosProspeccaoDto } from '../../common/prospeccao';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import {
  GestaoProspeccoesService,
  type TipoProspeccao,
} from './gestao-prospeccoes.service';

class FiltrosGestaoDto extends FiltrosProspeccaoDto {
  @IsOptional() @IsIn(['LEAD', 'PROSPECT', 'CLIENTE']) tipo?: TipoProspeccao;
  @IsOptional() @IsString() status?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  pagina?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) tamanho?: number;
}
class TipoRegistroDto {
  @IsIn(['LEAD', 'PROSPECT', 'CLIENTE']) tipo!: TipoProspeccao;
  @IsString() id!: string;
}

@ApiTags('Gestão de Prospecções')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL)
@Controller('gestao-prospeccoes')
export class GestaoProspeccoesController {
  constructor(private readonly service: GestaoProspeccoesService) {}
  @Get() listar(
    @CurrentUser() user: AuthUser,
    @Query() filters: FiltrosGestaoDto,
  ) {
    return this.service.listar(user, filters);
  }
  @Get('opcoes') opcoes(@CurrentUser() user: AuthUser) {
    return this.service.opcoes(user);
  }
  @Get(':tipo/:id/historico') historico(
    @CurrentUser() user: AuthUser,
    @Param() params: TipoRegistroDto,
  ) {
    return this.service.historico(user, params.tipo, params.id);
  }
}
