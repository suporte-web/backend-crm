import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { ClientPropostaDecisionDto } from './dto/client-proposta-decision.dto';
import { CreatePropostaDto } from './dto/create-proposta.dto';
import { UpdatePropostaDto } from './dto/update-proposta.dto';
import { PropostasService } from './propostas.service';

@ApiTags('Propostas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tickets/:ticketId/propostas')
export class PropostasController {
  constructor(private readonly propostasService: PropostasService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL)
  create(
    @CurrentUser() user: AuthUser,
    @Param('ticketId') ticketId: string,
    @Body() dto: CreatePropostaDto,
  ) {
    return this.propostasService.create(user, ticketId, dto);
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
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL)
  update(
    @CurrentUser() user: AuthUser,
    @Param('ticketId') ticketId: string,
    @Param('propostaId') propostaId: string,
    @Body() dto: UpdatePropostaDto,
  ) {
    return this.propostasService.update(user, ticketId, propostaId, dto);
  }

  @Post(':propostaId/enviar-cliente')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTAO, UserRole.COMERCIAL)
  sendToClient(
    @CurrentUser() user: AuthUser,
    @Param('ticketId') ticketId: string,
    @Param('propostaId') propostaId: string,
  ) {
    return this.propostasService.sendToClient(user, ticketId, propostaId);
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
}
