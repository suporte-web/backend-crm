# Motivos de perda de oportunidades — entrega local de 05/11/2026

## Atualização: aplicação autorizada no banco local

Após autorização explícita da usuária em 05/11/2026, foi criado e validado backup completo de crm_portal e aplicada exclusivamente a migration 20261105160000_motivos_perda_oportunidade. As duas colunas opcionais de texto, motivoPerda e observacaoPerda, existem no banco local. A migration específica foi registrada pelo Prisma com o checksum correspondente ao arquivo. Nenhuma outra migration foi executada ou teve seu registro alterado.

As 3 oportunidades e seus dados anteriores foram conferidos por contagem e assinatura antes/depois e permanecem iguais. A consulta Prisma de detalhes, incluindo oportunidades e demais relacionamentos usados em ClientsService.getClientOrFail, passou para os 3 cadastros vinculados, somente em modo de leitura. O erro P2022 informado para Opportunity.motivoPerda foi resolvido nessa verificação.

Backup: [crm_portal-antes-motivos-perda.dump](C:/Users/caroline.augusto/Desktop/repositório/Pizzattolog-CRM/backups/banco-local/2026-11-05T18-45-00-917Z/crm_portal-antes-motivos-perda.dump). As conferências antes/depois estão na mesma pasta.

O banco da VM não foi alterado. As divergências históricas e as outras migrations pendentes continuam exigindo revisão antes de uma aplicação geral. A seção abaixo registra a entrega original, anterior a essa autorização; a condição de migration ainda não executada descrita nela foi superada somente no banco local por esta atualização.

## Situação da entrega original (antes da autorização do banco local)

Implementação nos repositórios organizados em C:/Users/caroline.augusto/Desktop/repositório/Pizzattolog-CRM. Novas colunas, catálogo, mensagens e indicadores em português. Nenhuma alteração executada no PostgreSQL. Migration somente preparada em arquivo; publicação e uso da versão dependem da criação controlada das duas novas colunas após reconciliação do histórico de migrations.

Os identificadores e rotas antigos usados pelas integrações continuam compatíveis. Não foram criados módulos ou controllers paralelos, outra tabela de oportunidades ou alterações no fluxo Lead → Prospect → Cliente. Nenhum commit, reset ou comando de stash foi executado. Arquivos removidos/modificados em tarefas anteriores foram preservados como encontrados.

## Funcionamento e validações

O catálogo único contém exatamente 14 motivos, cada um com codigo, rotulo e exigeObservacao. A API e o componente Material UI usam esse catálogo; o BI agrega os códigos, sem agrupar por texto livre.

Os status existentes são OPEN (Aberta), WON (Ganha) e LOST (Perdida). As etapas finais continuam GANHO/PERDIDO. Ao selecionar Perdida no detalhe da proposta, abre o formulário com motivo obrigatório e observações. Limitação operacional e Outro motivo exigem justificativa não vazia, mesmo que sejam enviados apenas espaços. Os demais motivos aceitam observações opcionais. Limite de observação: 2000 caracteres, informado na tela e validado também na API.

A validação central cobre criação já perdida, edição, mudança de etapa e mudança de status pelo cadastro. Chamadas diretas sem motivo, com categoria arbitrária ou justificativa obrigatória ausente recebem HTTP 400 com mensagem em português. Não basta uma validação no navegador. As permissões atuais de Administração, Gestão, Comercial e Consultora são mantidas; Consultora continua limitada ao responsável e às permissões de tela. Marketing não passa a encerrar oportunidades.

Motivo e observação são retornados nas consultas existentes, aparecem por completo nos detalhes e são guardados no histórico com autoria, valores anteriores e valores novos. Ao reabrir ou ganhar, os dados da perda atual são limpos; o histórico anterior permanece. As aprovações de propostas e chamados também usam essa limpeza e preservação de histórico. Salvar a mesma categoria não registra falsamente uma mudança de motivo.

## Prisma e compatibilidade dos registros existentes

- Nova coluna opcional motivoPerda: identificador padronizado do catálogo.
- Nova coluna opcional observacaoPerda: justificativa/observação completa.
- Campo existente lostReason reutilizado como texto/rótulo de compatibilidade. Os textos livres antigos são preservados e exibidos como Registro anterior.
- Nenhuma tabela, relacionamento, enum do banco ou campo anterior foi removido.
- Perdas antigas com motivoPerda nulo são apresentadas como Motivo não informado. Não há backfill nem motivo fictício. Para salvar a edição de uma perda antiga, é necessário classificá-la, inclusive quando a rota antiga deixou status LOST com uma etapa aberta.

## Endpoints

Com o prefixo global /api já utilizado pelo projeto:

- Novo GET /oportunidades/motivos-perda (também disponível em /opportunities/motivos-perda), autenticado, retorna catálogo em português.
- POST /oportunidades e /opportunities: motivo/observação aceitos e validados na criação perdida.
- PATCH /oportunidades/:id e /opportunities/:id: edição com as mesmas regras.
- PATCH /oportunidades/:id/etapa e aliases atuais /opportunities/:id/stage: mesmas regras de encerramento.
- PATCH /clients/:clientId/opportunities/:opportunityId/status: recebe motivoPerda e observacaoPerda e sincroniza etapa/status; preserva assinatura anterior para Aberta/Ganha.
- GET de lista e detalhes existentes retornam os campos adicionais, sem retirar campos anteriores.
- Alias de entrada lostReason permanece aceito para integrações existentes, desde que corresponda a um código ou rótulo do catálogo nas novas gravações de perda. Textos arbitrários não são novas categorias.

## BI Comercial

A seção Análise de oportunidades perdidas apresenta total de perdas, taxa sobre encerradas, principal motivo, gráfico de barras, quantidade e percentual por motivo. A taxa é Perdidas / (Ganhas + Perdidas) × 100; sem encerradas, retorna 0%.

Dados vêm da listagem autenticada existente de oportunidades, com seu escopo comercial. Cada ID é contado uma vez, apenas status LOST entra nas perdas; OPEN e WON com dados antigos nunca entram como perdas atuais. Outro motivo e Limitação operacional não são subdivididos por justificativa. Registros antigos/sem classificação têm a categoria Motivo não informado.

Os filtros de período atuais são compartilhados: no painel de cadastros, filtram criação do cadastro; nesta seção, criação da oportunidade, explicitado na interface. Dia inicial/final considera UTC-3, com fim inclusivo. Não havia filtro de responsável adicional nesta página; a seção mantém o escopo autorizado pelo endpoint. Falhas ao buscar oportunidades ou catálogo exibem Alert e não geram números fictícios. Nenhum dado de demonstração foi adicionado à produção.

## Testes e validações

- Prisma validate --schema prisma/schema: aprovado.
- Prisma generate --schema prisma/schema: aprovado, Prisma Client 7.8.0 gerado localmente.
- TypeScript do backend e frontend: sem erros.
- Build NestJS e Next.js: concluídos.
- Novos testes de backend desta funcionalidade: 50 aprovados, em 4 suítes, sem acessar PostgreSQL. Incluem validação central, DTOs e aliases, serviços, HTTP, detalhes, histórico, reabertura, aprovação e permissões.
- Frontend: 6 testes aprovados em scripts/motivos-perda.test.cjs, cobrindo validação, agregação, deduplicação, percentual, período, legado, reabertura e corpo da chamada da API.
- Regressões adicionais do frontend: 4 testes de anexos e 8 de consulta CNPJ aprovados.
- Suíte completa do backend: 458 testes aprovados, 10 falhos, 9 ignorados; 65 suítes aprovadas, 10 falhas, 6 ignoradas. As opções de testes com banco real foram explicitamente desligadas.

As falhas da suíte completa estão fora das novas regras de motivos. Há testes antigos de instanciação sem os providers/mocks exigidos, uma suíte vazia e dois cenários de chamados/chat com expectativa/mock desatualizados. Não foram alteradas permissões ou implementação de outros módulos apenas para tornar esses testes verdes. Arquivos/cenários:

- src/modules/quotes/quotes.controller.spec.ts: QuotesController should be defined
- src/modules/auth/auth.controller.spec.ts: AuthController should be defined
- src/modules/tickets/tickets.controller.spec.ts: TicketsController should be defined
- src/modules/clientes/clients.controller.spec.ts: ClientsController should be defined
- src/modules/chats/chats.service.spec.ts: TicketsService segmented access gestão vê tickets criados por ela; TicketsService segmented access cliente não recebe notificação de mensagem interna
- src/modules/auth/auth.service.spec.ts: AuthService should be defined
- src/modules/users/users.service.spec.ts: UsersService should be defined
- src/modules/tickets/tickets.service.spec.ts: TicketsService should be defined
- src/modules/quotes/quotes.service.spec.ts: QuotesService should be defined
- src/modules/users/users.controller.spec.ts: arquivo sem testes executáveis (suíte vazia).

## Como testar localmente

Nos respectivos diretórios:

Backend:

```powershell
npx prisma validate --schema prisma/schema
npx prisma generate --schema prisma/schema
npx tsc --noEmit
npm run build
npx jest --runInBand motivos-perda.spec.ts motivos-perda.service.spec.ts motivos-perda.http.spec.ts ganho-oportunidade.spec.ts
```

Se o Prisma tentar baixar novamente um engine já instalado neste Windows, usar apenas nesta sessão: $env:PRISMA_SCHEMA_ENGINE_BINARY = (Resolve-Path 'node_modules/@prisma/engines/schema-engine-windows.exe').Path. Não alterar configuração de produção para esse caminho local.

Frontend:

```powershell
npx tsc --noEmit
node scripts/motivos-perda.test.cjs
npm run build
```

Teste manual com persistência somente depois que a alteração do banco for autorizada e aplicada em ambiente apropriado: abrir uma proposta, selecionar Perdida, escolher um dos 14 motivos, tentar Limitação operacional/Outro sem descrição, salvar com justificativa, conferir detalhes/histórico, reabrir e confirmar o BI. Antes da migration, as consultas Prisma que leem as novas colunas podem falhar: não iniciar/publicar esta versão do backend contra um banco sem essas colunas.

## Migration pendente e plano para a VM

Arquivo preparado: prisma/migrations/20261105160000_motivos_perda_oportunidade/migration.sql. Contém apenas duas colunas TEXT opcionais na tabela Opportunity, ambas com nomes em português. Nenhum UPDATE, DELETE, classificação de dados antigos ou alteração de tabela executada nesta tarefa.

O histórico local já tinha divergências. A pesquisa nos arquivos existentes encontrou lostReason na migration original de oportunidades, de 23/04/2026; nenhuma outra migration existente já criava motivoPerda/observacaoPerda. A migration de cotação do site não cobre esta alteração. Não se pode assumir que o histórico da VM é igual ao local.

Plano posterior, sem execução nesta entrega:

1. Fazer backup e revisar o histórico/checksums/estado das migrations da VM, somente com consultas de leitura inicialmente.
2. Conferir a estrutura real de Opportunity e a presença/ausência das duas colunas. Reconciliar as divergências antes de aplicar qualquer migration; não usar reset ou db push como atalho.
3. Revisar e aplicar a alteração aditiva em janela controlada, por responsável autorizado, após a reconciliação. Não executar um deploy automático que aplique indiscriminadamente todo o histórico.
4. Validar/gerar Prisma Client e executar os builds com as dependências travadas do projeto (npm ci). Publicar backend e frontend compatíveis depois da estrutura pronta.
5. Conferir o processo real utilizado na VM; reiniciar pelos nomes existentes do gerenciador de processos. Se for PM2, consultar pm2 list antes de usar os nomes. Nenhuma publicação foi feita.
6. Verificar o inicializador/Dockerfile: a documentação anterior registra migrate deploy no CMD do Dockerfile. Nesta etapa não usar esse inicializador para aplicar migrations automaticamente. A implantação precisa tratar explicitamente a reconciliação e o início da aplicação.
7. Fazer os testes manuais com um perfil autorizado e um sem permissão, conferindo anexos, dados comerciais e integração CRM/Site.

## Arquivos do backend desta entrega

- [prisma/schema/Oportunidade.prisma](C:/Users/caroline.augusto/Desktop/repositório/Pizzattolog-CRM/backend-crm/prisma/schema/Oportunidade.prisma)
- [prisma/migrations/20261105160000_motivos_perda_oportunidade/migration.sql](C:/Users/caroline.augusto/Desktop/repositório/Pizzattolog-CRM/backend-crm/prisma/migrations/20261105160000_motivos_perda_oportunidade/migration.sql)
- [src/modules/oportunidades/motivos-perda.ts](C:/Users/caroline.augusto/Desktop/repositório/Pizzattolog-CRM/backend-crm/src/modules/oportunidades/motivos-perda.ts)
- [src/modules/oportunidades/dto/dados-perda.dto.ts](C:/Users/caroline.augusto/Desktop/repositório/Pizzattolog-CRM/backend-crm/src/modules/oportunidades/dto/dados-perda.dto.ts)
- [src/modules/oportunidades/dto/criar-oportunidade.dto.ts](C:/Users/caroline.augusto/Desktop/repositório/Pizzattolog-CRM/backend-crm/src/modules/oportunidades/dto/criar-oportunidade.dto.ts)
- [src/modules/oportunidades/dto/atualizar-oportunidade.dto.ts](C:/Users/caroline.augusto/Desktop/repositório/Pizzattolog-CRM/backend-crm/src/modules/oportunidades/dto/atualizar-oportunidade.dto.ts)
- [src/modules/oportunidades/dto/atualizar-etapa-oportunidade.dto.ts](C:/Users/caroline.augusto/Desktop/repositório/Pizzattolog-CRM/backend-crm/src/modules/oportunidades/dto/atualizar-etapa-oportunidade.dto.ts)
- [src/modules/oportunidades/oportunidades.controller.ts](C:/Users/caroline.augusto/Desktop/repositório/Pizzattolog-CRM/backend-crm/src/modules/oportunidades/oportunidades.controller.ts)
- [src/modules/oportunidades/oportunidades.service.ts](C:/Users/caroline.augusto/Desktop/repositório/Pizzattolog-CRM/backend-crm/src/modules/oportunidades/oportunidades.service.ts)
- [src/modules/oportunidades/ganho-oportunidade.ts](C:/Users/caroline.augusto/Desktop/repositório/Pizzattolog-CRM/backend-crm/src/modules/oportunidades/ganho-oportunidade.ts)
- [src/modules/oportunidades/ganho-oportunidade.spec.ts](C:/Users/caroline.augusto/Desktop/repositório/Pizzattolog-CRM/backend-crm/src/modules/oportunidades/ganho-oportunidade.spec.ts)
- [src/modules/oportunidades/motivos-perda.spec.ts](C:/Users/caroline.augusto/Desktop/repositório/Pizzattolog-CRM/backend-crm/src/modules/oportunidades/motivos-perda.spec.ts)
- [src/modules/oportunidades/motivos-perda.service.spec.ts](C:/Users/caroline.augusto/Desktop/repositório/Pizzattolog-CRM/backend-crm/src/modules/oportunidades/motivos-perda.service.spec.ts)
- [src/modules/oportunidades/motivos-perda.http.spec.ts](C:/Users/caroline.augusto/Desktop/repositório/Pizzattolog-CRM/backend-crm/src/modules/oportunidades/motivos-perda.http.spec.ts)
- [src/modules/clientes/clients.controller.ts](C:/Users/caroline.augusto/Desktop/repositório/Pizzattolog-CRM/backend-crm/src/modules/clientes/clients.controller.ts)
- [src/modules/clientes/clients.service.ts](C:/Users/caroline.augusto/Desktop/repositório/Pizzattolog-CRM/backend-crm/src/modules/clientes/clients.service.ts)
- [src/modules/clientes/dto/update-oportunidade-status.dto.ts](C:/Users/caroline.augusto/Desktop/repositório/Pizzattolog-CRM/backend-crm/src/modules/clientes/dto/update-oportunidade-status.dto.ts)
- [src/modules/propostas/propostas.service.ts](C:/Users/caroline.augusto/Desktop/repositório/Pizzattolog-CRM/backend-crm/src/modules/propostas/propostas.service.ts)
- [src/modules/tickets/tickets.service.ts](C:/Users/caroline.augusto/Desktop/repositório/Pizzattolog-CRM/backend-crm/src/modules/tickets/tickets.service.ts)

Documentação: este relatório e docs/superpowers/plans/2026-11-05-motivos-perda.md.

## Arquivos do frontend desta entrega

- [src/types/crm.ts](C:/Users/caroline.augusto/Desktop/repositório/Pizzattolog-CRM/frontend-crm/src/types/crm.ts)
- [src/services/crm.service.ts](C:/Users/caroline.augusto/Desktop/repositório/Pizzattolog-CRM/frontend-crm/src/services/crm.service.ts)
- [src/services/motivos-perda.service.ts](C:/Users/caroline.augusto/Desktop/repositório/Pizzattolog-CRM/frontend-crm/src/services/motivos-perda.service.ts)
- [src/lib/perda-oportunidade.ts](C:/Users/caroline.augusto/Desktop/repositório/Pizzattolog-CRM/frontend-crm/src/lib/perda-oportunidade.ts)
- [src/components/crm/campos-perda-oportunidade.tsx](C:/Users/caroline.augusto/Desktop/repositório/Pizzattolog-CRM/frontend-crm/src/components/crm/campos-perda-oportunidade.tsx)
- [src/components/crm/opportunity-list.tsx](C:/Users/caroline.augusto/Desktop/repositório/Pizzattolog-CRM/frontend-crm/src/components/crm/opportunity-list.tsx)
- [src/app/clientes/[id]/components/PaginaDetalhesCliente.tsx](C:/Users/caroline.augusto/Desktop/repositório/Pizzattolog-CRM/frontend-crm/src/app/clientes/[id]/components/PaginaDetalhesCliente.tsx)
- [src/app/clientes/[id]/components/detalhes-cliente/AbaOportunidadePropostaCliente.tsx](C:/Users/caroline.augusto/Desktop/repositório/Pizzattolog-CRM/frontend-crm/src/app/clientes/[id]/components/detalhes-cliente/AbaOportunidadePropostaCliente.tsx)
- [src/app/clientes/[id]/components/detalhes-cliente/detalhes-cliente-compartilhado.tsx](C:/Users/caroline.augusto/Desktop/repositório/Pizzattolog-CRM/frontend-crm/src/app/clientes/[id]/components/detalhes-cliente/detalhes-cliente-compartilhado.tsx)
- [src/app/clientes/[id]/propostas/[propostaId]/components/PaginaDetalhePropostaCliente.tsx](C:/Users/caroline.augusto/Desktop/repositório/Pizzattolog-CRM/frontend-crm/src/app/clientes/[id]/propostas/[propostaId]/components/PaginaDetalhePropostaCliente.tsx)
- [src/app/bi-comercial/components/BiComercialPage.tsx](C:/Users/caroline.augusto/Desktop/repositório/Pizzattolog-CRM/frontend-crm/src/app/bi-comercial/components/BiComercialPage.tsx)
- [src/app/bi-comercial/components/AnalisePerdasOportunidades.tsx](C:/Users/caroline.augusto/Desktop/repositório/Pizzattolog-CRM/frontend-crm/src/app/bi-comercial/components/AnalisePerdasOportunidades.tsx)
- [scripts/motivos-perda.test.cjs](C:/Users/caroline.augusto/Desktop/repositório/Pizzattolog-CRM/frontend-crm/scripts/motivos-perda.test.cjs)
