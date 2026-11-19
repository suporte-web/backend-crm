import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import type { AuthUser } from '../auth/types/auth-user.type';
import { ImportacoesCadastrosService } from './importacoes-cadastros.service';
import { ConfirmarImportacaoDto, PrepararImportacaoDto } from './dtos/importacao-cadastro.dto';
import { MAX_ARQUIVO } from './xlsx-limites';

@ApiTags('Importações de cadastros') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL, UserRole.CONSULTORA)
@Controller('importacoes-cadastros')
export class ImportacoesCadastrosController {
  constructor(private readonly importacoes: ImportacoesCadastrosService) {}
  @Get('opcoes') opcoes(@CurrentUser() user: AuthUser) { return this.importacoes.opcoes(user); }
  @Get() listar(@CurrentUser() user: AuthUser) { return this.importacoes.listar(user); }
  @Get(':id') obter(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) { return this.importacoes.obter(user, id); }
  @Post('previa')
  @UseInterceptors(FileInterceptor('arquivo', { limits: { fileSize: MAX_ARQUIVO, files: 1, fields: 2 } }))
  preparar(@CurrentUser() user: AuthUser, @UploadedFile() file: { buffer: Buffer; originalname: string } | undefined, @Body() dto: PrepararImportacaoDto) { return this.importacoes.preparar(user, file, dto); }
  @Post(':id/confirmar')
  confirmar(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ConfirmarImportacaoDto) { return this.importacoes.confirmar(user, id, dto); }
}
