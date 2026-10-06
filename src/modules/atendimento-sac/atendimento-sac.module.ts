import { UsuarioSacGuard } from './usuario-sac.guard';
import { Module } from '@nestjs/common';
import { AtendimentoSacController } from './atendimento-sac.controller';
import { AtendimentoSacService } from './atendimento-sac.service';
@Module({
  controllers: [AtendimentoSacController],
  providers: [AtendimentoSacService, UsuarioSacGuard],
  exports: [AtendimentoSacService],
})
export class AtendimentoSacModule {}
