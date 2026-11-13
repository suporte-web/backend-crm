# Backend CRM

API do CRM em NestJS e TypeScript, com PostgreSQL e Prisma.

## Estrutura

- `src/modules/`: módulos de negócio, controllers, services, guards e DTOs.
- `src/common/`: regras e utilitários compartilhados.
- `src/config/`: configuração da aplicação.
- `src/prisma/`: integração do NestJS com o Prisma.
- `prisma/schema/` e `prisma/migrations/`: modelos e histórico do banco.
- `scripts/`: rotinas operacionais executadas manualmente.
- `storage/`, `uploads/` e `private-uploads/`: arquivos utilizados pela aplicação.
- `backup/`: cópias de segurança existentes.

## Desenvolvimento

Configure o arquivo `.env` com as credenciais do ambiente antes de iniciar.

```sh
npm ci
npx prisma generate
npm run dev
```

## Compilação e execução

```sh
npm run build
npm run start:prod
```

Use `npm run lint` para analisar e corrigir o código e `npm run format` para formatar fontes e scripts.

## Scripts operacionais

- `npm run site:sync-current-content`: sincroniza o conteúdo do site institucional.
- `npm run site:backfill-social-carreiras-images`: preenche imagens das páginas social e carreiras.
- `npx ts-node -r tsconfig-paths/register scripts/importar-relatos-sac.ts`: vincula relatos anteriores do site ao SAC.

Esses comandos acessam e podem alterar os dados do ambiente configurado no `.env`.

## Relatórios GA4 sem Google Cloud

Em **Marketing > Métricas**, a origem padrão é **Importação de CSV (sem Google Cloud)**.
Também há um atalho **Importar relatório do GA4** no cartão de Google Analytics em Integrações.

1. No GA4, selecione a propriedade e o período, abra um relatório detalhado e use **Compartilhar relatório > Fazer download > CSV**.
2. No CRM, informe o nome do relatório, o ID da propriedade (para este site, `283055240`) e o mesmo período da exportação.
3. Selecione o arquivo e clique em **Importar e salvar**. O relatório ficará disponível para Marketing e Administração.

O CSV deve estar em UTF-8, com vírgula ou ponto e vírgula como separador, uma tabela com cabeçalhos distintos, no máximo 50 colunas, 5.000 linhas e 2 MB. Metadados de exportação iniciados com `#` são ignorados, enquanto valores de dimensões como `#Campaign` são preservados. Arquivos vazios, malformados ou com múltiplas tabelas são rejeitados sem salvar dados. PDF e XLSX não são suportados nesta importação.

Os valores são exibidos como exportados, sem somar usuários ou inferir métricas ausentes. O período e a propriedade são declarados pelo usuário na importação. O CRM mostra a origem manual e a data de importação; novas métricas precisam de uma nova exportação e importação. A consulta lista as 100 importações mais recentes e pagina cada tabela em 25 linhas. Este fluxo não muda as tags do site nem indica uma conexão OAuth ativa.

### Banco e publicação

A tabela `MarketingManualReport` é criada pela migração `20261006160000_marketing_manual_reports`.
Para publicar em outro ambiente, inclua frontend e backend, gere o cliente Prisma, confira as migrações pendentes e aplique a migração antes de iniciar a versão nova:

```sh
npx prisma generate
npx prisma migrate status
npx prisma migrate deploy
```

O banco local recebeu esta migração em 06/10/2026. Nenhuma publicação em servidor foi feita nesta alteração.
