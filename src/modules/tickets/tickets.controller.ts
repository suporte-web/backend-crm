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
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';

@ApiTags('Tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  create(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateTicketDto,
  ) {
    return this.ticketsService.create(user.sub, dto);
  }

  @Get('me')
  findMine(@CurrentUser() user: { sub: string }) {
    return this.ticketsService.findMine(user.sub);
  }

  @ApiQuery({ name: 'status', required: false, type: String })
  @Get()
  findAll(
    @CurrentUser() user: { sub: string; role: string },
    @Query('status') status?: string,
  ) {
    return this.ticketsService.findAll(user, { status });
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
    @CurrentUser() user: { sub: string; role: string },
    @Param('id') id: string,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.ticketsService.updateStatus(user, id, dto);
  }
}