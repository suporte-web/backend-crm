import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';

import { LeadAnexosController } from './lead-anexos.controller';
import { LeadAnexosService } from './lead-anexos.service';

import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

import { GestaoProspeccoesController } from './gestao-prospeccoes.controller';
import { GestaoProspeccoesService } from './gestao-prospeccoes.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    LeadsController,
    LeadAnexosController,
    GestaoProspeccoesController,
  ],
  providers: [LeadsService, LeadAnexosService, GestaoProspeccoesService],
  exports: [LeadsService],
})
export class LeadsModule {}
