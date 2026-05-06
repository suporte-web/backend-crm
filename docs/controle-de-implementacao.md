# Controle de implementacao

Data: 2026-05-06

## Resumo do que foi feito

- Bloqueada a criacao, salvamento e envio de proposta sem valor positivo no frontend e no backend.
- Ajustados os campos de prazo/validade para aceitarem texto livre:
  - `Quote.desiredDeadline` agora e texto.
  - `Proposta.validadeDias` agora e texto.
- Corrigido o upload de anexo da proposta para gravar arquivos com extensao real e validar MIME/extensao, resolvendo preview/download de PDF.
- Ajustado o fluxo de chat para registrar leitura por participante e retornar contagem de mensagens nao lidas.
- Ajustada a experiencia por perfil:
  - `ADMIN`, `GESTAO`, `COMERCIAL` e `MARKETING` seguem experiencia empresarial.
  - `CLIENTE` ve o dashboard como `Canal do Cliente`.
  - Rotas do frontend agora bloqueiam acesso fora do perfil esperado.
  - `MARKETING` passa a ter leitura de clientes/dashboard no backend, sem acoes de edicao/exclusao no frontend.
- Ajustada a pagina de cotacoes para prazo textual e exibicao segura de textos nao-data.
- Criada migration Prisma para os novos tipos e o controle de leitura do chat.
- Adicionado o novo fluxo paralelo para leads do formulario publico do site:
  - `POST /entradas/site` cria um Ticket de Entrada com origem `SITE`, sem criar cliente ativo e sem criar login.
  - Nova entidade `Prospect` separa prospect de `Client`, com `statusCadastral` e `portalAccessStatus`.
  - Central de Entradas lista tickets do site para o Comercial assumir, qualificar e vincular/criar prospect.
  - Ticket de entrada so cria cotacao depois de prospect ou cliente ativo estar vinculado.
  - Cotacao de prospect fica vinculada ao `prospectId` e ao ticket de origem, sem criar oportunidade/pre-contrato automaticamente.
  - Aprovacao de cotacao de prospect altera o prospect para `AGUARDANDO_CADASTRO`.
  - Criacao de proposta/pre-contrato por ticket de prospect sem cliente ativo foi bloqueada no backend.

## Arquivos alterados

Backend (`backend-crm`):

- `prisma/schema.prisma`
- `prisma/migrations/20260506103000_fix_proposta_quote_chat_fields/migration.sql`
- `prisma/migrations/20260506143000_add_site_entry_prospects/migration.sql`
- `src/app.module.ts`
- `src/modules/chats/chats.controller.ts`
- `src/modules/chats/chats.service.ts`
- `src/modules/clients/clients.controller.ts`
- `src/modules/clients/clients.service.ts`
- `src/modules/propostas/dto/create-proposta.dto.ts`
- `src/modules/propostas/dto/update-proposta.dto.ts`
- `src/modules/propostas/propostas.controller.ts`
- `src/modules/propostas/propostas.service.ts`
- `src/modules/quotes/quotes.service.ts`
- `src/modules/tickets/dto/ticket-actions.dto.ts`
- `src/modules/tickets/tickets.service.ts`
- `src/modules/entradas/entradas.controller.ts`
- `src/modules/entradas/entradas.module.ts`
- `src/modules/entradas/entradas.service.ts`
- `src/modules/entradas/dto/create-site-ticket.dto.ts`
- `src/modules/entradas/dto/create-entrada-quote.dto.ts`
- `src/modules/entradas/dto/link-prospect.dto.ts`
- `src/modules/entradas/dto/entrada-actions.dto.ts`
- `docs/controle-de-implementacao.md`

Frontend (`frontend-crm`):

- `src/app/chat/page.tsx`
- `src/app/clients/[id]/page.tsx`
- `src/app/clients/page.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/quotes/[id]/page.tsx`
- `src/app/quotes/page.tsx`
- `src/app/entradas/page.tsx`
- `src/app/entradas/[id]/page.tsx`
- `src/app/tickets/page.tsx`
- `src/components/chat/ChatBox.tsx`
- `src/components/layout/header.tsx`
- `src/components/layout/protected-route.tsx`
- `src/components/layout/sidebar.tsx`
- `src/services/chatService.ts`
- `src/services/entradas.service.ts`
- `src/types/chat.ts`
- `src/types/entradas.ts`
- `src/types/quotes.ts`
- `src/types/tickets.ts`

Observacao: a execucao do build do frontend tambem atualizou arquivos gerados em `.next/`. Eles nao representam alteracao funcional de codigo-fonte.

## Motivo das alteracoes

- Valor de proposta: evitar rascunho, salvamento e envio sem valor negociado, inclusive por chamadas diretas a API.
- Prazo/validade textual: permitir entradas reais do negocio, como `30 dias`, `10 dias uteis` e `conforme negociacao`.
- PDF/anexo: o upload anterior salvava arquivo sem extensao, o que prejudicava MIME, abertura no navegador, preview e download.
- Cotacoes: evitar formatacao obrigatoria como data quando o prazo e texto, mantendo todos os status disponiveis no filtro.
- Roles: alinhar navegacao, backend e telas para separar perfis empresariais do perfil cliente.
- Chat: permitir identificar mensagens novas/nao lidas e limpar a contagem ao abrir a conversa.
- Leads do site: criar um caminho de entrada comercial antes do cadastro ativo, evitando que um lead publico nasca como cliente com login.
- Prospect: manter compatibilidade com cotacao sem flexibilizar o cadastro de `Client.userId`, que segue representando cliente ativo com usuario.
- Contrato/pre-contrato: impedir que ticket de prospect avance diretamente para contrato antes da conversao em cliente ativo.
- Central de Entradas: separar visualmente os tickets de formulario publico da tela atual de tickets de clientes ativos.

## Impacto no sistema

- Requer aplicar a migration Prisma antes de usar a nova versao em banco existente.
- Propostas sem valor positivo passam a receber erro de validacao.
- PDFs novos de proposta passam a ser salvos com extensao `.pdf` quando aplicavel.
- Valores antigos de `Quote.desiredDeadline` e `Proposta.validadeDias` sao convertidos para texto pela migration.
- A listagem de chat passa a retornar `unreadCount` e `lastReadAt`.
- Ao carregar mensagens de um chat, a conversa e marcada como lida para o usuario atual.
- Perfil `MARKETING` ganha acesso de leitura a clientes/dashboard empresarial; acoes sensiveis seguem restritas.
- Perfil `CLIENTE` passa a ver o dashboard como `Canal do Cliente`.
- `Quote.clientId` passa a ser opcional apenas para permitir cotacao vinculada a prospect; as rotas atuais de cliente logado continuam criando cotacao com `clientId` obrigatorio.
- Tickets de origem `SITE` recebem campos de protocolo, solicitante, payload do formulario, prospect vinculado e fechamento.
- Prospects criados pelo site recebem `statusCadastral = PROSPECT` e `portalAccessStatus = SEM_ACESSO`.
- Ao aprovar cotacao com `prospectId`, o prospect vai para `AGUARDANDO_CADASTRO`; contrato, operacao, entrega e rastreamento continuam dependendo de cliente ativo.
- A nova tela `/entradas` fica disponivel para `ADMIN`, `GESTAO` e `COMERCIAL`.

## Checklist de testes manuais

- Tentar criar proposta sem valor e confirmar erro no frontend.
- Tentar salvar proposta existente removendo o valor e confirmar erro.
- Tentar enviar proposta ao cliente sem valor e confirmar bloqueio.
- Tentar enviar proposta para Gestao sem valor e confirmar bloqueio.
- Criar proposta com valor positivo e confirmar salvamento.
- Informar validade como `30 dias`, `10 dias uteis` e `conforme negociacao`.
- Criar/editar cotacao com prazo textual e confirmar exibicao na lista e no detalhe.
- Conferir filtro de cotacoes com `Todos`, `Recebida`, `Em analise`, `Respondida`, `Aprovada` e `Rejeitada`.
- Anexar PDF na proposta, abrir em nova aba e baixar o arquivo.
- Enviar mensagem no chat com outro usuario e confirmar badge de nao lidas.
- Abrir a conversa e confirmar que a contagem de nao lidas zera.
- Validar menu e rotas com perfis `ADMIN`, `GESTAO`, `COMERCIAL`, `MARKETING` e `CLIENTE`.
- Confirmar que cliente visualiza `Canal do Cliente` no dashboard/sidebar/header.
- Enviar payload para `POST /entradas/site` e confirmar criacao de ticket com origem `SITE`.
- Abrir `/entradas` como Comercial/Admin/Gestao e confirmar que o ticket aparece na listagem.
- Assumir ticket na Central de Entradas e confirmar responsavel/status.
- Abrir detalhe da entrada e confirmar dados do solicitante, mensagem e payload extra.
- Sem prospect vinculado, confirmar que o botao de criar cotacao fica bloqueado.
- Criar novo prospect a partir do ticket e confirmar `statusCadastral = PROSPECT` e `portalAccessStatus = SEM_ACESSO`.
- Vincular prospect existente por sugestao e confirmar atualizacao do ticket.
- Criar cotacao apos vincular prospect e confirmar `quoteId` no ticket e `prospectId` na cotacao.
- Aprovar cotacao de prospect e confirmar prospect em `AGUARDANDO_CADASTRO`.
- Tentar criar proposta/pre-contrato em ticket de prospect sem cliente ativo e confirmar bloqueio.
- Validar que cliente ativo logado ainda cria cotacao pelo portal pelo fluxo antigo.
- Validar que contrato, entregas e rastreamento continuam usando apenas clientes ativos.

## Validacoes executadas

- `npx prisma generate`: executado com sucesso.
- `npm run build` no backend: sucesso.
- `npm run build` no frontend: sucesso.
- `npx jest src/modules/chats/chats.service.spec.ts --runInBand`: sucesso.
- `npx jest --runInBand`: falhou em specs preexistentes de setup de teste sem providers/mocks (`Auth`, `Users`, `Clients`, `Quotes`, `Tickets`, `Trackings`) e uma suite sem testes. A spec de chat afetada pela mudanca foi corrigida e passou isoladamente.

## Pendencias ou duvidas

- Aplicar a migration no ambiente alvo antes do deploy.
- Decidir se arquivos gerados `.next/` devem continuar versionados; o `.gitignore` ja lista `.next`, mas ha arquivos rastreados no repositorio.
- Se houver anexos antigos salvos sem extensao, eles podem continuar sem MIME correto ate serem reenviados ou migrados.
- Confirmar se `MARKETING` deve ter apenas leitura em clientes/dashboard ou tambem alguma acao operacional adicional.
- Definir a tela/processo final para completar cadastro e converter `Prospect` em `Client` ativo com login.
- Se o formulario publico do site estiver em outro projeto, integrar o envio dele ao endpoint `POST /entradas/site`.
- Se for necessario distribuir entradas por setores alem de cotacao, detalhar regras de permissao por tipo (`fornecedor`, `fiscal`, `juridico`, etc.).
