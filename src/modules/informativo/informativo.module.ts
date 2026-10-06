import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { InformativoController } from './informativo.controller';
import { InformativoService } from './informativo.service';
import { IntegracaoInformativoGuard } from './guards/integracao-informativo.guard';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [InformativoController],
  providers: [InformativoService, IntegracaoInformativoGuard],
})
export class InformativoModule {}
