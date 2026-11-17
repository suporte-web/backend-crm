import { CotacaoSiteWorkflowService } from './cotacao-site-workflow.service';
import { CotacaoSiteTriagemService } from './cotacao-site-triagem.service';
import { Module } from '@nestjs/common';

import { SolicitacoesSiteController } from './solicitacoes-site.controller';
import { SolicitacoesSiteService } from './solicitacoes-site.service';

@Module({
  controllers: [
    SolicitacoesSiteController,
  ],
  providers: [
    CotacaoSiteWorkflowService,
    CotacaoSiteTriagemService,
    SolicitacoesSiteService,
  ],
  exports: [
    SolicitacoesSiteService,
  ],
})
export class SolicitacoesSiteModule {}