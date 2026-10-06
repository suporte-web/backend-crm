import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../modules/auth/decorators/roles.decorator';
import { UserRole } from '../modules/auth/enums/user-role.enum';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../modules/auth/guards/roles.guard';
import { MetricsPeriodDto } from './dto/metrics-period.dto';
import { MarketingMetricsService } from './marketing-metrics.service';

@ApiTags('Métricas de Marketing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MARKETING)
@Controller('marketing-metrics')
export class MarketingMetricsController {
  constructor(private readonly metrics: MarketingMetricsService) {}
  @Get('resumo') resumo(@Query() period: MetricsPeriodDto) {
    return this.metrics.resumo(period);
  }
  @Get('trafego') trafego(@Query() period: MetricsPeriodDto) {
    return this.metrics.trafego(period);
  }
  @Get('paginas') paginas(@Query() period: MetricsPeriodDto) {
    return this.metrics.paginas(period);
  }
  @Get('eventos') eventos(@Query() period: MetricsPeriodDto) {
    return this.metrics.eventos(period);
  }
}
