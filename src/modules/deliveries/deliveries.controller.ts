import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
  findAll(@Query() filters: QueryDeliveriesDto) {
    return this.deliveriesService.findAll(filters);
  }

  @Get('resumo')
  getSummary(@Query() filters: QueryDeliveriesDto) {
    return this.deliveriesService.getSummary(filters);
  }

  @Get('find-cities')
  findCities(@Query() filters: QueryDeliveriesDto) {
    return this.deliveriesService.findCities(filters);
  }

  @Get('find-regions')
  findRegions(@Query() filters: QueryDeliveriesDto) {
    return this.deliveriesService.findRegions(filters);
  }

  @Get('find-payers')
  findPayers(@Query() filters: QueryDeliveriesDto) {
    return this.deliveriesService.findPayers(filters);
  }

  @Get('find-occurrences')
  findOccurrences(@Query() filters: QueryDeliveriesDto) {
    return this.deliveriesService.findOccurrences(filters);
  }

  
}
