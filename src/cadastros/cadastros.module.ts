import { Module } from '@nestjs/common';
import { CadastrosController } from './cadastros.controller';
import { CadastrosService } from './cadastros.service';
import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [LeadsModule],
  controllers: [CadastrosController],
  providers: [CadastrosService],
})
export class CadastrosModule {}
