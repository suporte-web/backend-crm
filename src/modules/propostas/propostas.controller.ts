import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { join } from 'path';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { ClientPropostaDecisionDto } from './dto/client-proposta-decision.dto';
import { CreatePropostaDto } from './dto/create-proposta.dto';
import { ManagementPropostaDecisionDto } from './dto/management-proposta-decision.dto';
import { UpdatePropostaDto } from './dto/update-proposta.dto';
import { PropostasService } from './propostas.service';

type UploadedPropostaFile = {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
};

const propostaFileInterceptor = FileInterceptor('arquivo', {
  dest: join(process.cwd(), 'uploads', 'propostas'),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

@ApiTags('Propostas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tickets/:ticketId/propostas')
export class PropostasController {
  constructor(private readonly propostasService: PropostasService) {}

  @Post()
  @UseInterceptors(propostaFileInterceptor)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL)
  create(
    @CurrentUser() user: AuthUser,
    @Param('ticketId') ticketId: string,
    @Body() dto: CreatePropostaDto,
    @UploadedFile() arquivo?: UploadedPropostaFile,
  ) {
    return this.propostasService.create(user, ticketId, dto, arquivo);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Param('ticketId') ticketId: string) {
    return this.propostasService.findAll(user, ticketId);
  }

  @Get(':propostaId')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('ticketId') ticketId: string,
    @Param('propostaId') propostaId: string,
  ) {
    return this.propostasService.findOne(user, ticketId, propostaId);
  }

  @Patch(':propostaId')
  @UseInterceptors(propostaFileInterceptor)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL)
  update(
    @CurrentUser() user: AuthUser,
    @Param('ticketId') ticketId: string,
    @Param('propostaId') propostaId: string,
    @Body() dto: UpdatePropostaDto,
    @UploadedFile() arquivo?: UploadedPropostaFile,
  ) {
    return this.propostasService.update(
      user,
      ticketId,
      propostaId,
      dto,
      arquivo,
    );
  }

  @Post(':propostaId/enviar-cliente')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL)
  sendToClient(
    @CurrentUser() user: AuthUser,
    @Param('ticketId') ticketId: string,
    @Param('propostaId') propostaId: string,
    @Body() dto: UpdatePropostaDto,
  ) {
    return this.propostasService.sendToClient(user, ticketId, propostaId, dto);
  }

  @Post(':propostaId/enviar-gestao')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COMERCIAL)
  sendToManagement(
    @CurrentUser() user: AuthUser,
    @Param('ticketId') ticketId: string,
    @Param('propostaId') propostaId: string,
  ) {
    return this.propostasService.sendToManagement(user, ticketId, propostaId);
  }

  @Post(':propostaId/aprovar-cliente')
  approveByClient(
    @CurrentUser() user: AuthUser,
    @Param('ticketId') ticketId: string,
    @Param('propostaId') propostaId: string,
  ) {
    return this.propostasService.approveByClient(user, ticketId, propostaId);
  }

  @Post(':propostaId/solicitar-ajuste-cliente')
  requestClientAdjustment(
    @CurrentUser() user: AuthUser,
    @Param('ticketId') ticketId: string,
    @Param('propostaId') propostaId: string,
    @Body() dto: ClientPropostaDecisionDto,
  ) {
    return this.propostasService.requestClientAdjustment(
      user,
      ticketId,
      propostaId,
      dto,
    );
  }

  @Post(':propostaId/recusar-cliente')
  rejectByClient(
    @CurrentUser() user: AuthUser,
    @Param('ticketId') ticketId: string,
    @Param('propostaId') propostaId: string,
    @Body() dto: ClientPropostaDecisionDto,
  ) {
    return this.propostasService.rejectByClient(
      user,
      ticketId,
      propostaId,
      dto,
    );
  }

  @Post(':propostaId/aprovar-gestao')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTAO)
  approveByManagement(
    @CurrentUser() user: AuthUser,
    @Param('ticketId') ticketId: string,
    @Param('propostaId') propostaId: string,
  ) {
    return this.propostasService.approveByManagement(
      user,
      ticketId,
      propostaId,
    );
  }

  @Post(':propostaId/solicitar-ajuste-gestao')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTAO)
  requestManagementAdjustment(
    @CurrentUser() user: AuthUser,
    @Param('ticketId') ticketId: string,
    @Param('propostaId') propostaId: string,
    @Body() dto: ManagementPropostaDecisionDto,
  ) {
    return this.propostasService.requestManagementAdjustment(
      user,
      ticketId,
      propostaId,
      dto,
    );
  }

  @Post(':propostaId/recusar-gestao')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTAO)
  rejectByManagement(
    @CurrentUser() user: AuthUser,
    @Param('ticketId') ticketId: string,
    @Param('propostaId') propostaId: string,
    @Body() dto: ManagementPropostaDecisionDto,
  ) {
    return this.propostasService.rejectByManagement(
      user,
      ticketId,
      propostaId,
      dto,
    );
  }
}
