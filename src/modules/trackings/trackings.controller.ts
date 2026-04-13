import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QueryTrackingDto } from './dto/query-tracking.dto';
import { TrackingsService } from './trackings.service';

@ApiTags('Rastreamentos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('trackings')
export class TrackingsController {
  constructor(private readonly trackingsService: TrackingsService) {}

  @Post('query')
  queryTracking(@Body() dto: QueryTrackingDto) {
    return this.trackingsService.queryTracking(dto);
  }
}