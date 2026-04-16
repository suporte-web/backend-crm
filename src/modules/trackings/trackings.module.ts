import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TrackingsController } from './trackings.controller';
import { TrackingsService } from './trackings.service';

@Module({
  imports: [HttpModule],
  controllers: [TrackingsController],
  providers: [TrackingsService],
})
export class TrackingsModule {}