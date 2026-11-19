import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import type { AuthUser } from '../auth/types/auth-user.type';
import { SegmentosService } from './segmentos.service';
import { CriarSegmentoDto, SalvarRegraCnaeDto } from './dtos/segmento.dto';

@ApiTags('Segmentos') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL, UserRole.CONSULTORA, UserRole.MARKETING)
@Controller('segmentos')
export class SegmentosController {
  constructor(private readonly segmentos: SegmentosService) {}
  @Get() listar() { return this.segmentos.listar(); }
  @Get('classificar') classificar(@Query('cnae') cnae = '') { return this.segmentos.classificar(cnae); }
  @Post() criar(@CurrentUser() user: AuthUser, @Body() dto: CriarSegmentoDto) { return this.segmentos.criar(user, dto); }
  @Get('regras') regras(@CurrentUser() user: AuthUser) { return this.segmentos.regras(user); }
  @Post('regras') salvar(@CurrentUser() user: AuthUser, @Body() dto: SalvarRegraCnaeDto) { return this.segmentos.salvarRegra(user, dto); }
}
