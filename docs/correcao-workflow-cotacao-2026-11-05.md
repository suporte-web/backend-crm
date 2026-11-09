# Correção do workflow de cotação — 05/11/2026

## Resultado

Os 36 erros originais decorreram de modelos Prisma locais incompletos. As colunas e relações físicas já estavam previstas pela migration 20261009120000_cotacao_site_workflow. As definições locais foram restauradas e o Prisma Client 7.8.0 foi regenerado, sem any, ts-ignore ou remoção do workflow.

Também foi concluída a ligação do workflow ao módulo e aos endpoints existentes. A triagem continua preservando a oportunidade do cadastro utilizada pelas telas atuais, mas o direcionamento agora registra explicitamente a etapa PROSPECT e o Prospect correspondente antes da conversão em Cliente.

## Relacionamentos locais adicionados

| Modelo | Definições |
| --- | --- |
| SolicitacaoSite | etapaCotacao: CotacaoSiteEtapa?; leadId único e opcional; prospectId e clientId opcionais; relações lead, prospect, client e responsavel. responsavelId já existia. |
| Lead | siteRequest opcional, lado inverso de Solicitação → Lead. Mantidos cadastroId/cadastro, convertedProspect e demais vínculos existentes. |
| Prospect | solicitacoesSite[]; mantidos sourceLead, convertedLeads e convertedClients. |
| Client | solicitacoesSite[]; mantidos CadastroLead, ClientSourceLead e ClientSourceProspect. |
| User (arquivo Usuario.prisma) | solicitacoesSiteResponsavel[]. |
| enums.prisma | CotacaoSiteEtapa com LEAD, PROSPECT e CLIENTE. |

As FKs usam onDelete Restrict e onUpdate Cascade, como na migration existente. Foram declarados os índices existentes de etapa/responsável, prospectId, clientId e unicidade de leadId. Os lados inversos das relações não criam colunas adicionais.

## Fluxo preservado

1. A captura pública mantém o payload e a rota existentes. Cria a solicitação e o Lead em uma transação, grava leadId e etapaCotacao=LEAD e encaminha a análise ao Marketing.
2. ADMIN, GESTAO ou MARKETING validam um Comercial ativo. O direcionamento cria ou reutiliza Prospect pelo documento, mantém convertedProspectId e proveniência do Lead e atribui responsável à solicitação.
3. A triagem mantém a oportunidade do cadastro LEAD já utilizada pelo CRM. A decisão usa bloqueio da solicitação e transação serializable com até três tentativas; chamadas repetidas não recriam Prospect ou oportunidade nem repetem avisos.
4. O Comercial atribuído, ADMIN ou GESTAO podem qualificar e converter. Outro Comercial e CONSULTORA não podem usar essas operações. Perfis compostos com CONSULTORA também não acessam a Fila do Site.
5. Na conversão, o documento identifica um Cliente existente. Se não houver e o Lead já tiver seu cadastro LEAD — inclusive sem documento — esse cadastro é promovido a CLIENTE, preservando o ID da oportunidade. A qualificação e o contato primário são sincronizados somente no cadastro que pertence a esse Lead.
6. Um Cliente independente já existente é reutilizado sem sobrescrever seus dados ou proprietário. A solicitação registra clientId e o histórico preserva Lead, Prospect e origem. Nesse caso o cadastro histórico da oportunidade pode continuar distinto do Cliente reutilizado: não é realizada fusão automática de cadastros, propostas ou históricos de empresas existentes.
7. Vínculos legados apenas em metadata são recuperados de forma controlada durante uma operação autorizada, sem criar outro Lead. Nenhum backfill foi executado nesta tarefa. Registros legados atribuídos com etapa nula continuam elegíveis à listagem e passam pela checagem de visibilidade após enriquecimento.
8. Os Leads do site permanecem na Fila do Site, fora do funil convencional. Leitura direta e observações verificam o acesso à solicitação. Rotas genéricas não podem atualizar, excluir ou converter um Lead vinculado ao workflow; novas associações a conversas/chamados e detalhe de chamado também verificam o acesso ao Lead.

Os mecanismos gerais já existentes de participantes de conversas e listagem de chamados foram preservados. Esta entrega não redefine a política geral de revogação de participação em conversas históricas ao redistribuir responsáveis.

Histórico, autor das ações e responsáveis são mantidos. Notificações em transações sujeitas a retry usam email=false: o aviso do CRM é transacional e nenhum webhook de e-mail é disparado antes do commit. Não foi acrescentado recurso de motivos de perda de oportunidades; a reprovação de cotação já existente foi preservada e não pode ocorrer depois de sua qualificação em Prospect/Cliente.

## Endpoints e contratos

Todos permanecem sob /api/integracoes/site/solicitacoes:

- POST /: captura pública mantida.
- GET / e GET /:id: JWT e escopo de visibilidade da Fila do Site.
- GET /responsaveis-comerciais: triagem autorizada.
- POST /:id/direcionar: rota existente, agora concilia Prospect e oportunidade.
- PATCH /:id/prospect: atualização de qualificação ligada ao workflow.
- POST /:id/converter-cliente: conversão após triagem, com DTO existente.
- POST /:id/reprovar: comportamento de reprovação preservado, com bloqueio após qualificação.
- GET /:id/anexos/:anexoId/download: autenticação e visibilidade da solicitação antes do download.

As respostas de qualificação e conversão mantêm o enriquecimento com cadastroId, oportunidadeId e responsável usado pelas telas atuais. Os estados legados OPORTUNIDADE/REPROVADO continuam sendo representados na resposta quando aplicáveis; o enum persistido do novo fluxo permanece LEAD/PROSPECT/CLIENTE. Nenhum arquivo do frontend foi alterado.

## Banco e migrations

Foi feita somente inspeção de catálogos do banco local crm_portal, com default_transaction_read_only=on, BEGIN READ ONLY e ROLLBACK. Nenhum conteúdo de cadastro foi alterado e nenhum teste realizou operações no PostgreSQL real.

Foram confirmados no banco local:

- As quatro colunas do workflow e o enum com os três valores.
- As FKs de leadId, prospectId, clientId e responsavelId com Restrict/Cascade.
- Os índices previstos, inclusive Solicitação → Lead único.
- A migration 20261009120000_cotacao_site_workflow aplicada com checksum idêntico ao arquivo local.

**Não foi criada nem executada migration nova.** Para esta correção, a migration existente cobre todas as definições restauradas. As divergências anteriores do histórico de migrations não foram reconciliadas nem marcadas como resolvidas artificialmente.

Antes de publicar em outra VM, conferir seu catálogo e seu histórico de migrations por leitura. A inspeção desta tarefa comprova o estado local, não o da VM. Caso a estrutura esteja ausente em outro ambiente, é necessário analisar a aplicação controlada da migration existente e seus efeitos sobre dados; não criar uma migration duplicando as mesmas colunas nem executar deploy/reset/db push como tentativa de correção.

Não foram executados prisma migrate deploy/dev/reset, prisma db push, SQL de alteração/atualização/exclusão, git reset --hard, stash pop/drop ou commits.

## Arquivos corrigidos nesta tarefa

Modelos:

- prisma/schema/SolicitacaoSite.prisma
- prisma/schema/Lead.prisma
- prisma/schema/Prospecto.prisma
- prisma/schema/Cliente.prisma
- prisma/schema/Usuario.prisma
- prisma/schema/enums.prisma

Implementação:

- src/modules/solicitacoes-site/cotacao-site-workflow.service.ts
- src/modules/solicitacoes-site/site-workflow-access.ts
- src/modules/solicitacoes-site/cotacao-site-triagem.service.ts
- src/modules/solicitacoes-site/solicitacoes-site.service.ts
- src/modules/solicitacoes-site/solicitacoes-site.controller.ts
- src/modules/solicitacoes-site/solicitacoes-site.module.ts
- src/modules/leads/leads.service.ts
- src/modules/chats/chats.service.ts
- src/modules/tickets/tickets.service.ts

Testes:

- src/modules/solicitacoes-site/cotacao-site-workflow.service.spec.ts
- src/modules/solicitacoes-site/cotacao-site-triagem.service.spec.ts
- src/modules/solicitacoes-site/solicitacoes-site.service.spec.ts
- src/modules/leads/leads.site-workflow.spec.ts
- src/modules/solicitacoes-site/cotacao-site-workflow.http.spec.ts (novo)

Documentação: este relatório e docs/superpowers/plans/2026-11-05-cotacao-workflow-types.md. O Prisma Client e dist foram gerados localmente. Alterações e exclusões anteriores no repositório foram preservadas; não houve novos commits nem operações de stash.

## Verificação local

Executar dentro do backend:

```powershell
npx prisma validate --schema prisma/schema
npx prisma generate --schema prisma/schema
npx tsc --noEmit
npm run build
node node_modules/jest/bin/jest.js --runInBand cotacao-site-workflow.service.spec.ts cotacao-site-workflow.http.spec.ts cotacao-site-triagem.service.spec.ts solicitacoes-site.service.spec.ts leads.site-workflow.spec.ts
```

Neste ambiente o proxy local bloqueava o download automático do executável Prisma. Foi utilizado o schema-engine-windows.exe já instalado, cujo hash de versão coincide com o esperado pelo Prisma 7.8.0, por meio da variável PRISMA_SCHEMA_ENGINE_BINARY somente no processo de validação. Não foi modificada a configuração global de proxy.

Os testes utilizam persistência simulada, incluindo o fluxo integrado triagem → Prospect → promoção do mesmo cadastro em Cliente, reuso de registros, vínculo legado, perfis, DTOs, autoria, contatos qualificados, idempotência e bloqueio de desvios pelas rotas antigas.


## Resultado final das validacoes

- prisma validate --schema prisma/schema: passou.
- prisma generate --schema prisma/schema: passou, Client 7.8.0.
- tsc --noEmit: passou, zero erros TypeScript.
- npm run build: passou, build NestJS concluido.
- Regressao ampliada: 187 testes em 20 suites, zero falhas.
- Conferencia de hashes: nenhum arquivo de migration criado, modificado ou excluido por esta tarefa.
- Nenhum commit ou operacao de stash foi executado.
