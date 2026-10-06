import { Module } from '@nestjs/common';
import { MarketingIntegrationsModule } from '../marketing-integrations/marketing-integrations.module';
import { MarketingMetricsController } from './marketing-metrics.controller';
import { MarketingMetricsService } from './marketing-metrics.service';
import { ManualReportsController } from './manual-reports.controller';
import { ManualReportsService } from './manual-reports.service';

@Module({
  imports: [MarketingIntegrationsModule],
  controllers: [MarketingMetricsController, ManualReportsController],
  providers: [MarketingMetricsService, ManualReportsService],
})
export class MarketingMetricsModule {}
