import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthUser } from '../auth/types/auth-user.type';
import { GestaoProspeccoesService } from './gestao-prospeccoes.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL)
@Controller('gestao-prospeccoes')
export class GestaoProspeccoesController {
  constructor(private readonly service: GestaoProspeccoesService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() filtros: Parameters<GestaoProspeccoesService['findAll']>[1],
  ) {
    return this.service.findAll(user, filtros);
  }

  @Get('opcoes')
  options(@CurrentUser() user: AuthUser) {
    return this.service.options(user);
  }

  @Get(':tipo/:id/historico')
  history(
    @CurrentUser() user: AuthUser,
    @Param('tipo') tipo: string,
    @Param('id') id: string,
  ) {
    return this.service.history(user, tipo, id);
  }
}
