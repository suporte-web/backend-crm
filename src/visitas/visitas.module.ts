import { Module } from '@nestjs/common';
import { AtendimentoSacModule } from '../atendimento-sac/atendimento-sac.module';
import { VisitasController } from './visitas.controller';
import { VisitasService } from './visitas.service';
@Module({
  imports: [AtendimentoSacModule],
  controllers: [VisitasController],
  providers: [VisitasService],
})
export class VisitasModule {}
