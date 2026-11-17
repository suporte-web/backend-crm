import { BadRequestException, Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import type { AuthUser } from '../auth/types/auth-user.type';
import { EmpresasConsultorasService } from './empresas-consultoras.service';
import { AtualizarEmpresaConsultoraDto, CriarEmpresaConsultoraDto, TransferirCadastroEmpresaDto, VincularCarteiraEmpresaDto, VincularUsuarioEmpresaDto } from './dtos/empresa-consultora.dto';

@ApiTags('Empresas consultoras')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.GESTAO)
@Controller('empresas-consultoras')
export class EmpresasConsultorasController {
  constructor(private readonly empresas: EmpresasConsultorasService) {}

  @Get()
  listar(@CurrentUser() user: AuthUser) { return this.empresas.listar(user); }

  @Get('usuarios')
  usuarios(@CurrentUser() user: AuthUser) { return this.empresas.usuarios(user); }

  @Post()
  criar(@CurrentUser() user: AuthUser, @Body() dto: CriarEmpresaConsultoraDto) { return this.empresas.criar(user, dto); }

  @Patch('cadastros/:cadastroId/empresa')
  transferir(@CurrentUser() user: AuthUser, @Param('cadastroId', ParseUUIDPipe) id: string, @Body() dto: TransferirCadastroEmpresaDto) {
    if (dto.empresaConsultoraId === undefined) throw new BadRequestException('Informe a empresa ou null para desvincular.');
    return this.empresas.transferirCadastro(user, id, dto.empresaConsultoraId);
  }

  @Patch(':id')
  atualizar(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AtualizarEmpresaConsultoraDto) { return this.empresas.atualizar(user, id, dto); }

  @Patch(':id/usuarios/:usuarioId')
  usuario(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Param('usuarioId', ParseUUIDPipe) usuarioId: string, @Body() dto: VincularUsuarioEmpresaDto) {
    return this.empresas.vincularUsuario(user, id, usuarioId, dto.vincular);
  }

  @Get(':id/carteira')
  carteira(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) { return this.empresas.carteira(user, id); }

  @Post(':id/carteira')
  vincularCarteira(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: VincularCarteiraEmpresaDto) { return this.empresas.vincularCarteira(user, id, dto); }
}
