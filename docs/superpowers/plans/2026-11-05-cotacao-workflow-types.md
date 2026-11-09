# Corrigir workflow de cotação — plano

Requisitos: solicitação do usuário de 05/11/2026. Não executar migrations, SQL de escrita, reset ou operações de stash. Não criar commits.

- [x] Restaurar somente as definições locais já previstas na migration 20261009120000_cotacao_site_workflow, mantendo CadastroLead, ClientSourceLead e ClientSourceProspect existentes.
- [x] Conferir validação, geração de tipos e zero erros TypeScript, sem any/ts-ignore na implementação.
- [x] Conectar o workflow aos endpoints atuais e preservar a oportunidade do cadastro na triagem; garantir Prospect antes de Cliente, vínculos, histórico, autoria e idempotência.
- [x] Cobrir estados legados com vínculo somente em metadata, autorizações e reutilização do cadastro LEAD na conversão em Cliente.
- [x] Executar testes mockados, validação Prisma, generate, tsc e build. Revisão independente e relatório de compatibilidade/migrations.

Decisões: usar campos nullable existentes e relações com Restrict/Cascade conforme a migration; não duplicar relações de proveniência. Preservar aliases e endpoints de reprovação existentes. A atualização do cadastro para CLIENTE ocorre somente quando a API de conversão for chamada pelo usuário, nunca durante os testes ou comandos desta tarefa.
