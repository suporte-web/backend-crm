import { ConfigModule } from '@nestjs/config';
import { RastreamentoPublicoController } from './rastreamento-publico.controller';
import { RastreamentoPublicoService } from './rastreamento-publico.service';
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TrackingsController } from './trackings.controller';
import { TrackingsService } from './trackings.service';

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [TrackingsController, RastreamentoPublicoController],
  providers: [TrackingsService, RastreamentoPublicoService],
})
export class TrackingsModule {}
