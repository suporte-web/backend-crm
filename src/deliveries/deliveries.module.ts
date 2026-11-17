import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DeliveriesController } from './deliveries.controller';
import { DeliveriesService } from './deliveries.service';

import { PostgresDeliveriesService } from './database/postgres-deliveries.service';
import { KmmDatabaseService } from './database/kmm-database.service';

@Module({
  imports: [ConfigModule],

  controllers: [DeliveriesController],

  providers: [
    DeliveriesService,
    PostgresDeliveriesService,
    KmmDatabaseService,
  ],

  exports: [
    PostgresDeliveriesService,
    KmmDatabaseService,
  ],
})
export class DeliveriesModule {}