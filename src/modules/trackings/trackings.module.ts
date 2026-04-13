import { Module } from '@nestjs/common';
import { TrackingsController } from './trackings.controller';
import { TrackingsService } from './trackings.service';

@Module({
  controllers: [TrackingsController],
  providers: [TrackingsService],
})
export class TrackingsModule {}