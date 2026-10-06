import { AtendimentoSacModule } from '../atendimento-sac/atendimento-sac.module';
import { TicketsModule } from '../tickets/tickets.module';
import { RelatosSiteController } from './relatos-site.controller';
import { RelatosSiteService } from './relatos-site.service';
import { Module } from '@nestjs/common';
import { EntradasController } from './entradas.controller';
import { EntradasService } from './entradas.service';

@Module({
  imports: [TicketsModule, AtendimentoSacModule],
  controllers: [EntradasController, RelatosSiteController],
  providers: [EntradasService, RelatosSiteService],
})
export class EntradasModule {}
