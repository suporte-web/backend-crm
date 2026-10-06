import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { LeadAnexosController } from './lead-anexos.controller';
import { LeadAnexosService } from './lead-anexos.service';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
  imports: [PrismaModule],
  controllers: [LeadsController, LeadAnexosController],
  providers: [LeadsService, LeadAnexosService],
  exports: [LeadsService],
})
export class LeadsModule {}
