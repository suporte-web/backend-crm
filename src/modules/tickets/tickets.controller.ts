import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TicketsService } from './tickets.service';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CreateTicketMessageDto } from './dto/create-ticket-message.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import {
  ClientTicketDecisionDto,
  ManagementTicketDecisionDto,
  SendPreProposalDto,
  SendToManagementDto,
} from './dto/ticket-actions.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';

@ApiTags('Tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTicketDto,
  ) {
    return this.ticketsService.create(user, dto);
  }

  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'q', required: false, type: String })
  @Get('me')
  findMine(
    @CurrentUser() user: { sub: string },
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('q') q?: string,
  ) {
    return this.ticketsService.findMine(user.sub, { status, type, q });
  }

  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'q', required: false, type: String })
  @Get()
  findAll(
    @CurrentUser() user: { sub: string; role: string },
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('q') q?: string,
  ) {
    return this.ticketsService.findAll(user, { status, type, q });
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: { sub: string; role: string },
    @Param('id') id: string,
  ) {
    return this.ticketsService.findOne(user, id);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.ticketsService.updateStatus(user, id, dto);
  }

  @Post(':id/start')
  start(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.ticketsService.start(user, id);
  }

  @Post(':id/messages')
  reply(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateTicketMessageDto,
  ) {
    return this.ticketsService.reply(user, id, dto);
  }

  @Post(':id/pre-proposal')
  sendPreProposal(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SendPreProposalDto,
  ) {
    return this.ticketsService.sendPreProposal(user, id, dto);
  }

  @Post(':id/client-decision')
  clientDecision(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ClientTicketDecisionDto,
  ) {
    return this.ticketsService.clientDecision(user, id, dto);
  }

  @Post(':id/send-to-management')
  sendToManagement(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SendToManagementDto,
  ) {
    return this.ticketsService.sendToManagement(user, id, dto);
  }

  @Post(':id/management-decision')
  managementDecision(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ManagementTicketDecisionDto,
  ) {
    return this.ticketsService.managementDecision(user, id, dto);
  }
}
