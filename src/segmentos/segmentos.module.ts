import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SegmentosController } from './segmentos.controller';
import { SegmentosService } from './segmentos.service';
@Module({ imports: [PrismaModule], controllers: [SegmentosController], providers: [SegmentosService], exports: [SegmentosService] })
export class SegmentosModule {}
