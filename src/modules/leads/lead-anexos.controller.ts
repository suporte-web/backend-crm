import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { LeadAnexosService } from './lead-anexos.service';

export class AnexoLeadDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(1000)
  comentario?: string;
}

@Controller('leads/:leadId/anexos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL, UserRole.MARKETING)
export class LeadAnexosController {
  constructor(private readonly anexos: LeadAnexosService) {}
  @Get()
  listar(
    @CurrentUser() user: AuthUser,
    @Param('leadId', ParseUUIDPipe) leadId: string,
  ) {
    return this.anexos.listar(user, leadId);
  }
  @Post()
  @UseInterceptors(
    FileInterceptor('arquivo', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1,
        fields: 1,
        fieldSize: 5000,
      },
    }),
  )
  anexar(
    @CurrentUser() user: AuthUser,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Body() dto: AnexoLeadDto,
    @UploadedFile() arquivo: Express.Multer.File,
  ) {
    return this.anexos.anexar(user, leadId, arquivo, dto.comentario);
  }
  @Get(':anexoId')
  async baixar(
    @CurrentUser() user: AuthUser,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Param('anexoId', ParseUUIDPipe) anexoId: string,
    @Res() res: Response,
  ) {
    const anexo = await this.anexos.baixar(user, leadId, anexoId);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', anexo.tipo);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="anexo"; filename*=UTF-8''${encodeURIComponent(anexo.nome)}`,
    );
    res.send(anexo.buffer);
  }
}
