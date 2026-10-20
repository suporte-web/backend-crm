# Validação de Cadastros e Oportunidades/Propostas

Data: 16/10/2026. Alterações no backend e em `../frontend-crm/frontend-crm`.

## Entrega no código

- Sidebar com Cadastros e Oportunidades/Propostas.
- Base unificada com filtro e seleção de modalidade Cliente/Lead.
- Formulários e detalhes existentes reaproveitados, incluindo contatos múltiplos, condições comerciais, documentos, dados de Lead, observações e histórico.
- Oportunidades de Clientes e Leads na mesma área, com os formulários e anexos atuais.
- Classificação separada do campo legado modality e da etapa comercial do funil.
- Cadastro compartilhado preservado na conversão; contatos normalizados para identificação pelos canais existentes.
- Links antigos de Leads resolvidos para Cadastros; novos links de propostas dentro de Oportunidades.
- Restrições de origem, perfil e responsável conferidas no backend. Consultoras acessam somente os próprios cadastros.
- Migração aditiva preparada em `prisma/migrations/20261016120000_unificar_cadastros/migration.sql`.

## Comandos e resultados

### Backend

- `node node_modules/prisma/build/index.js generate`: aprovado, cliente Prisma gerado.
- `node node_modules/@nestjs/cli/bin/nest.js build`: aprovado.
- `node node_modules/typescript/bin/tsc --project tsconfig.build.json --noEmit --incremental false`: aprovado.
- ESLint dos arquivos novos de Cadastros, permissões, sincronização e testes: aprovado.
- `node node_modules/jest/bin/jest.js --runInBand --json --outputFile=validacao-cadastros.tmp.json`: 248 testes aprovados, 10 com falha e 4 ignorados. Foram 42 suítes aprovadas, 11 com falha e 3 ignoradas.
- As sete suítes relacionadas à mudança passaram integralmente, somando 55 testes: `common/cadastros.spec.ts` (6), `modules/cadastros/cadastros.service.spec.ts` (6), `modules/oportunidades/oportunidades.cadastros.spec.ts` (1), `modules/oportunidades/dto/oportunidade.dto.spec.ts` (5), `modules/leads/exclusoes-leads.service.spec.ts` (13), `modules/leads/leads.prospeccao.spec.ts` (5) e `modules/leads/gestao-prospeccoes.spec.ts` (19).

As falhas remanescentes estão nos testes antigos:

- `modules/auth/auth.controller.spec.ts`: dependências do controlador não fornecidas.
- `modules/auth/auth.service.spec.ts`: dependências do serviço não fornecidas.
- `modules/clientes/clients.controller.spec.ts`: dependências e guarda não fornecidas no módulo de teste.
- `modules/clientes/clients.service.spec.ts`: dependências do serviço não fornecidas.
- `modules/quotes/quotes.controller.spec.ts`: dependências do controlador não fornecidas.
- `modules/quotes/quotes.service.spec.ts`: dependências do serviço não fornecidas.
- `modules/tickets/tickets.controller.spec.ts`: dependências do controlador não fornecidas.
- `modules/tickets/tickets.service.spec.ts`: dependências do serviço não fornecidas.
- `modules/users/users.service.spec.ts`: dependências do serviço não fornecidas.
- `modules/chats/chats.service.spec.ts`: o teste “gestão vê tickets criados por ela” espera uma consulta sem o filtro atual de exclusão de chamados SAC.
- `modules/users/users.controller.spec.ts`: arquivo sem testes, contado como suíte com falha.

### Frontend

- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: aprovado.
- `node --max-old-space-size=2048 node_modules/next/dist/bin/next build`: aprovado. Geradas as rotas `/cadastros`, `/cadastros/[id]`, `/oportunidades`, `/oportunidades/cadastro/[id]` e `/oportunidades/cadastro/[id]/propostas/[propostaId]`.
- `node tests/cadastros-permissoes.test.cjs`: 9 testes aprovados, cobrindo permissões antigas, bloqueio explícito, Consultora, rotas de propostas, agrupamento por modalidade e persistência sem reativar acessos bloqueados.
- `git diff --check`: sem erros de espaços nos dois repositórios. Há avisos de conversão LF/CRLF em arquivos que já estavam modificados.

## Revisão independente

A tela Permissões por perfil também foi reorganizada: Cadastros reúne os controles de Clientes e Leads, enquanto Oportunidades/Propostas possui controle independente. As permissões antigas continuam armazenadas como modalidades de Cadastros, sem aparecer como telas duplicadas. O estado dos controles usa a mesma verificação da navegação; salvar outra permissão não amplia as modalidades permitidas. A checagem TypeScript e os nove testes foram executados novamente após esse ajuste.

Uma revisão somente de leitura identificou cinco problemas, corrigidos antes da validação final: exclusão de oportunidade sem conferir responsável; normalização ausente em novos Leads; confusão entre cadastro compartilhado e cliente convertido na exclusão; nome do contato principal sobrescrito pelo nome da empresa; e cadastro órfão após exclusão de Lead. A compatibilidade dos links antigos também foi ajustada.

## Banco local e limitação de ativação

`node test/cadastros-migracao.cjs` passou duas vezes em um schema isolado do PostgreSQL local, com rollback integral ao final. O teste confirma que o Lead ativo continua Lead, o cliente convertido é reutilizado, os metadados permanecem e o contato é criado sem duplicar o cliente existente.

O banco local `localhost:5432/crm_portal` tem migrações registradas que não existem nesta cópia do repositório. A migração nova é a única pendente identificada pelo Prisma. A revisão automática rejeitou `prisma migrate deploy` porque a aplicação altera esquema e dados em um banco com histórico divergente, exigindo autorização explícita da usuária para essa aplicação.

A migração não foi aplicada ao banco principal local. Nenhuma alteração foi publicada em servidor ou produção. A interface autenticada com os dados reais ainda precisa de validação após a autorização e aplicação da migração; compilar as páginas não substitui essa verificação visual e funcional.

Após autorização específica, conferir novamente as migrações pendentes, aplicar a migração nova no banco local e validar os fluxos autenticados. A publicação em produção não está autorizada por esta entrega.


## Padronização dos nomes em português

O módulo foi renomeado de `opportunities` para `oportunidades`, incluindo arquivos, classes, métodos e DTOs (`CriarOportunidadeDto`, `AtualizarOportunidadeDto` e `AtualizarEtapaOportunidadeDto`). Os novos campos de cadastro usam `modalidadeCadastro`, `cadastroId`, `leadCadastro` e `dadosLead`, com os valores `CLIENTE` e `LEAD` no código.

A rota principal agora é `/oportunidades`. A entrada da API usa `clienteId`, `cotacaoId`, `titulo`, `valor`, `etapa`, `previsaoFechamento`, `preContrato`, `observacoesPreContrato` e `motivoPerda`. Os endereços e campos anteriores continuam aceitos como aliases para compatibilidade. O frontend foi atualizado para os campos e funções traduzidos, e as mensagens de validação dos DTOs de oportunidades estão em português.

Os nomes físicos já entregues na migração foram mantidos por `@map` e `@@map`. `node test/cadastros-nomes-portugues.cjs` confirmou por comparação de esquemas que essa tradução não muda tabelas, colunas, índices ou valores armazenados. A migração original permanece a mesma; nenhuma migração foi aplicada nesta correção.

Após a padronização: compilação NestJS aprovada, build Next.js aprovado, nove testes de permissões do frontend aprovados e 55 testes relacionados do backend aprovados. A suíte completa manteve somente as 11 suítes com falha discriminadas anteriormente (10 testes com falha e um arquivo sem testes), agora com 248 testes aprovados. O primeiro build NestJS encontrou uma falha transitória de limpeza de `dist`; a repetição concluiu com sucesso.

## Correção do erro JSON ao cadastrar

A inspeção de `information_schema.columns` identificou `Client.address` e `Client.bankDetails` como `jsonb` no banco local, embora o schema Prisma, os DTOs e a migração original de inclusão desses campos usem texto. O erro P2007/22P02 foi reproduzido com `client.update()` enviando um endereço comum para uma cópia isolada da tabela.

A migração `20261016160000_corrigir_campos_texto_cadastro` alinha somente essas duas colunas ao tipo `TEXT`, caso ainda estejam em `json` ou `jsonb`. Strings JSON viram texto sem aspas extras, objetos e arrays mantêm seu conteúdo serializado, e valores nulos continuam nulos. Colunas que já são texto ficam intactas. Não há alteração no campo legado `contacts`: os contatos atuais continuam na relação `ClientContact`.

O teste optativo `cadastros.banco.integration.spec.ts` usa tabelas vazias isoladas e rollback integral; confirma preservação de conteúdo, repetição da migração, criação e atualização por Prisma. Junto aos testes de serviço e de associação ao funil, foram aprovados 13 testes. A correção ainda precisa ser aplicada ao banco de uso da aplicação; os testes não alteram seus cadastros.

Para aplicar somente essa correção, na pasta do backend e com `DATABASE_URL` apontando para o banco pretendido:

```powershell
npx prisma db execute --file .\prisma\migrations\20261016160000_corrigir_campos_texto_cadastro\migration.sql
```

Esse comando não aplica outras migrações pendentes nem modifica seu histórico. Quando a nova migração for executada posteriormente pelo fluxo normal do Prisma, ela será inofensiva nas colunas já corrigidas. Não é necessário regenerar o cliente Prisma para esta correção: seu schema já espera texto.

## Exclusão autorizada mesmo com histórico

Comercial, Gestão e Administrador podem excluir diretamente Clientes e Leads, inclusive com oportunidades, conversões ou solicitações pendentes. O endpoint existente de solicitação de exclusão retorna `APROVADA` após concluir a exclusão para esses perfis. Consultora continua no fluxo de solicitação; Marketing e Cliente não podem executar exclusão direta. As verificações também existem nos serviços, e o frontend considera todos os perfis do usuário.

A exclusão compartilhada fica em `src/common/exclusao-cadastros.ts`: registra uma cópia do cadastro, contatos, documentos, oportunidades e eventos na auditoria; remove o cadastro e o Lead associado; desvincula chamados, conversas, cotações e propostas para preservá-los; encerra solicitações pendentes. O acesso ao portal do usuário Cliente vinculado é desativado, preservando sua autoria nos registros. O fluxo de aprovação de exclusão de cliente usa a mesma rotina.

Validação: 61 testes do backend aprovados em sete suítes, incluindo três testes no PostgreSQL local, um para cada perfil autorizado. Os testes reais criam registros sintéticos, exercitam as exclusões por cadastro e pelo funil e revertem a transação integralmente. Compilação NestJS, TypeScript do frontend e os nove testes de permissões do frontend aprovados. Não é necessária uma migração para esta mudança. Nenhum cadastro real foi excluído durante a implementação.

## Etapa comercial no cadastro

O formulário de novo cadastro oferece a etapa do funil comercial. Na aba Cadastro, um bloco compacto permite consultar e salvar essa etapa. A gravação usa `PATCH /cadastros/:id/etapa`, valida as sete etapas e respeita permissões e autoria. Marketing pode consultar; Administrador, Gestão, Comercial e Consultora autorizada podem editar.

A etapa continua em `Lead.status`, a mesma fonte do BI Comercial e do Funil de Vendas. Novos Clientes recebem um Lead canônico vinculado, sem criar outro cadastro ou acesso ao portal. Para Clientes antigos sem Lead, salvar a etapa cria o vínculo com a data original do cadastro. Etapas sugeridas: Entrada de Leads para novo Lead e Venda Efetivada para novo Cliente, ambas ajustáveis. Alterar a etapa não muda automaticamente a modalidade.

O Funil de Vendas passou a consultar ativos e convertidos, sem restringir a origem a manual/site, deduplicando pelo ID e incluindo a etapa Perdido. O BI Comercial continua aplicando seu filtro de data de criação; um cadastro antigo vinculado ao funil pode exigir selecionar Todo o período. Painéis já abertos precisam ser atualizados para reler os dados.

Validação específica: 11 testes do backend aprovados, incluindo um teste PostgreSQL com rollback que cobre Cliente, Lead, cliente antigo sem vínculo e alterações nos dois sentidos. TypeScript do frontend, sete testes do BI e quatro do formulário aprovados. Não é necessária migração de banco para incluir a etapa: são reutilizadas as relações e colunas existentes.

## Próxima ação, responsável e volume mensal no cadastro

Os três campos foram incluídos no novo cadastro e no bloco Acompanhamento comercial da aba Cadastro. O botão Salvar acompanhamento permite alterar esses dados sem mudar a etapa. A API aceita os campos em português e grava nos metadados existentes do Lead: `nextAction`, `responsible` e `monthlyEstimatedValue`. Os demais metadados são preservados e campos vazios podem ser limpos explicitamente. O volume aceita números em formato brasileiro, validando entradas inválidas no backend.

O detalhe do cadastro retorna os três valores e os mostra no cabeçalho, com o volume formatado em reais. São os mesmos campos usados pelo BI Comercial e pelo Funil de Vendas. Não são necessárias colunas ou migrações novas.

Validação: 18 testes do backend aprovados, incluindo teste PostgreSQL com rollback para a gravação dos três campos nas modalidades Cliente e Lead; TypeScript do frontend, sete testes do BI e quatro testes do formulário aprovados.

## Correção do erro 500 ao excluir cadastro de origem do site

O erro P2003 foi reproduzido no PostgreSQL: as colunas legadas `SolicitacaoSite.leadId` e `SolicitacaoSite.clientId` possuem chaves estrangeiras com `ON DELETE RESTRICT`, embora não estejam no schema Prisma atual. Excluir o Lead antes de desvincular essas solicitações causava a falha `SolicitacaoSite_leadId_fkey` informada pela usuária.

O helper `src/common/solicitacoes-site-vinculos.ts` verifica a presença dessas colunas e desvincula somente o Lead/Cliente em exclusão, na mesma transação. O conteúdo da solicitação e seus anexos permanecem existentes. A correção foi aplicada à exclusão pelo cadastro, à exclusão direta do funil e à aprovação de solicitações de exclusão de leads. Não é necessária alteração de banco.

O teste PostgreSQL de exclusão agora inclui uma solicitação do site vinculada simultaneamente ao Cliente e ao Lead e confirma sua preservação após excluir ambos. Antes da correção falhou com o mesmo P2003; depois passou para os três perfis autorizados. Foram aprovados 25 testes nas três suítes de exclusão, com rollback de todos os registros sintéticos.

## Foto ou logo para Clientes e Leads

O novo cadastro permite selecionar uma foto/logo com prévia. Na aba Cadastro, os perfis com permissão de edição podem trocar ou remover a imagem e confirmar em Salvar imagem. O avatar do cabeçalho mostra a foto salva; sem imagem, conserva a inicial da empresa.

A foto usa `Lead.metadata.logoUrl`, preservando os demais dados comerciais. O endpoint `PATCH /cadastros/:id/foto` respeita acesso e autoria do cadastro e permite remoção explícita. O backend valida formato PNG/JPG/WebP/GIF, assinatura e limite de 1,5 MB; o parser JSON aceita até 3 MB para comportar a imagem codificada em base64. Não são necessárias colunas novas ou migração.

Validação: 15 testes do backend aprovados, incluindo tipos/tamanho da imagem e gravação/troca/remoção em Cliente e Lead no PostgreSQL com rollback, sem apagar outros metadados. TypeScript do frontend e quatro testes do formulário aprovados.
