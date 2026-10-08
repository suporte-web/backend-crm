# Gestão de Visitas

Implementação no frontend `frontend-crm/frontend-crm` e backend `frontend-crm/backend-crm`, dentro do módulo Atendimento.

## Uso

Acesse **Atendimento → Visitas** (`/atendimento/visitas`). A listagem oferece cards, filtros e paginação. Cada visita tem protocolo próprio, cliente livre/CNPJ editável, responsável, participantes internos e externos e abas de dados, realização, validação, pós-visita, anexos e histórico.

ADMIN, GESTAO e LIDER_ATENDIMENTO podem cadastrar, editar, atribuir e validar visitas. ATENDIMENTO acessa somente as visitas atribuídas a ele. O backend verifica usuário ativo, permissões e etapa em todas as operações; o menu e os formulários seguem essas regras.

O fluxo passa por agendamento, realização, validação e pós-visita. Reagendamentos preservam as datas anteriores. Ajustes de realização geram versões, preservando o conteúdo anterior. Recusa da nova data retorna à validação com ajustes obrigatórios. Quando o pós-visita gera SAC, a visita só pode ser concluída depois da conclusão desse atendimento. Os dois detalhes oferecem links entre visita e SAC.

Anexos aceitam PDF, JPG e PNG de até 10 MB. O download exige autenticação e acesso à visita. O armazenamento usa `VISITAS_UPLOAD_DIR`, com padrão `private-uploads/visitas` no diretório de execução do backend. Configure um volume persistente para esse diretório na implantação.

## Implantação

A migration foi validada em PostgreSQL temporário e aplicada, com autorização do usuário, em 07/10/2026 ao banco configurado do CRM (`crm_portal`, schema `public`, localhost:5432). A execução de `prisma migrate status` confirmou o schema atualizado; o cliente Prisma foi regenerado.

No backend correto:

```powershell
npx prisma migrate deploy
npx prisma generate
npm run build
```

No frontend correto:

```powershell
npm run build
```

Inicie/reinicie os serviços conforme o processo já adotado pelo CRM. Não há nova variável de integração para o SAC: a criação reutiliza o serviço existente, na mesma transação da visita.

## Verificação

- Prisma validate/generate e TypeScript sem erros.
- Builds de produção do backend e frontend aprovados.
- Testes de política, serviço e endpoints HTTP de visitas aprovados. Cobrem acesso por responsável, usuário inativo, roles atuais, sequência de etapas, reagendamento, revisões, avaliação, integração SAC e rollback.
- PostgreSQL 17 isolado: schema anterior criado, SQL da migration aplicado, fluxo completo Visita → SAC → conclusão e regressão do SAC aprovados (4 testes). A transação dos testes foi revertida, e o servidor temporário foi encerrado e removido.
- Frontend: 26 testes aprovados de formulários condicionais, menu/permissões, atalhos e interface SAC.
- Revisão corrigiu limpeza de campos opcionais entre versões e salvamento atômico de dados/participantes.

Comandos para repetir os testes sem banco:

```powershell
# Backend
npx jest --runInBand visitas.policy.spec visitas.service.spec visitas.http.spec atendimento-sac.spec anexos-livres.spec relatos-site.spec
# Frontend
node --test scripts/visitas.test.cjs scripts/interface-sac.test.mjs scripts/dashboard-shortcuts.test.mjs tests/user-permissions.test.cjs
```

O teste `visitas.banco.spec.ts` é opt-in com `VISITAS_TESTAR_BANCO=1`. Use um DATABASE_URL de teste com a migration aplicada. Para repetir também o SAC integrado, habilite `SAC_TESTAR_BANCO=1`.

A suíte geral do backend contém falhas anteriores à funcionalidade. Os testes básicos de auth, clientes, quotes, tickets e users não fornecem todas as dependências do Nest; `users.controller.spec.ts` está vazio; a expectativa de acesso em `chats.service.spec.ts` está desatualizada em relação ao filtro SAC já existente. Esses problemas permanecem registrados e não indicam falha nos testes de visitas.

Resultado da suíte geral na implementação inicial: 45 suítes, sendo 31 aprovadas, 11 com falhas anteriores e 3 opt-in ignoradas. Testes: 172 aprovados, 10 falharam e 4 ignorados. Os testes de banco ignorados nessa execução foram aprovados separadamente no PostgreSQL temporário.

## Ajuste de cliente livre — 07/10/2026

O campo Cliente é preenchido diretamente, sem seleção, consulta ou criação no módulo Clientes. Nome e CNPJ são salvos na própria visita; a geração do SAC também usa esses dados, sem associar o ticket a um cliente cadastrado. O filtro procura pelo nome livre ou CNPJ.

A migration `20261007153000_visita_cliente_livre` copia o nome das visitas antigas antes de remover a relação com Client. O identificador antigo permanece somente como informação histórica, sem chave estrangeira e sem uso na API. Novas visitas deixam esse identificador vazio.

Verificação do ajuste: 48 testes de backend e 26 de frontend aprovados; TypeScript e builds de produção aprovados. A preservação de uma visita anterior e o fluxo cliente livre → SAC passaram no PostgreSQL temporário (4 testes). A migration foi aplicada ao `crm_portal`; `prisma migrate status` confirmou todas as migrations aplicadas.
