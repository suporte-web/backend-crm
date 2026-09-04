import { Module } from '@nestjs/common';

import { SolicitacoesSiteController } from './solicitacoes-site.controller';
import { SolicitacoesSiteService } from './solicitacoes-site.service';

@Module({
  controllers: [
    SolicitacoesSiteController,
  ],
  providers: [
    SolicitacoesSiteService,
  ],
  exports: [
    SolicitacoesSiteService,
  ],
})
export class SolicitacoesSiteModule {}