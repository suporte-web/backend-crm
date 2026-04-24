import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QueryDeliveriesDto } from './dto/query-deliveries.dto';
import { DeliveriesService } from './deliveries.service';

@ApiTags('Entregas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('entregas')
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get()
  findAll(
    @CurrentUser() _user: { sub: string; role: string },
    @Query() filters: QueryDeliveriesDto,
  ) {
    return this.deliveriesService.findAll(filters);
  }

  @Get('resumo')
  getSummary(
    @CurrentUser() _user: { sub: string; role: string },
    @Query() filters: QueryDeliveriesDto,
  ) {
    return this.deliveriesService.getSummary(filters);
  }
}
