import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DeliveriesController } from './deliveries.controller';
import { DeliveriesService } from './deliveries.service';
import { PostgresDeliveriesService } from './database/postgres-deliveries.service';

@Module({
  imports: [ConfigModule],
  controllers: [DeliveriesController],
  providers: [DeliveriesService, PostgresDeliveriesService],
})
export class DeliveriesModule {}
