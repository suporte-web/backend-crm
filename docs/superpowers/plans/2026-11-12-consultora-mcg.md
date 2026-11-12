# Consultora MCG Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Aplicar a regra de leitura MCG confirmada pela usuária.
**Architecture:** Filtros Prisma compartilhados para responsável MCG e autoria comprovada no histórico existente. Sem alteração de schema ou interface.
**Tech Stack:** NestJS, Prisma, Jest.
**Spec:** docs/superpowers/specs/2026-11-12-consultora-mcg-design.md

## Global Constraints
Preservar telas, permissões de escrita e acesso do Comercial. Não alterar dados históricos.

## Review Focus
Busca combinada com escopo; ID direto; oportunidades de autores diferentes no mesmo cadastro; indicadores e histórico; usuários com múltiplos perfis.

## Tasks
- [x] Criar testes para leitura MCG sem autoria e preservação de escrita em cadastros; executar e observar falha.
- [x] Ampliar somente leitura em `cadastros.service.ts`, usando helper em `common/acesso-consultora.ts`.
- [x] Testar autoria de oportunidades no mesmo cadastro MCG, bloqueio por ID e manutenção do Comercial.
- [x] Aplicar filtros em `oportunidades.service.ts` e nas respostas de leitura de `clients.service.ts`, incluindo indicadores e histórico.
- [x] Executar testes dos módulos afetados e build; revisar diff e registrar resultados.

## Ledger
Execução no checkout indicado pela usuária, sem criar worktree. Não realizar commit, push ou migração. Autoria de oportunidades será obtida do evento transacional de criação, sem inferir autor pelo responsável interno.

Revisão independente identificou e corrigiu liberação indireta de edição de lead/observação, download direto e eventos de documentos de oportunidades do Comercial, retorno de oportunidades ocultas na resposta de edição e ausência de condição MCG na rota legada de status. Testes de regressão cobrem essas rotas e condições.

Validação final: `node node_modules/@nestjs/cli/bin/nest.js build` aprovado; `git diff --check` aprovado. Jest dos módulos afetados, excluindo os dois testes esqueleto legados sem providers (`clients.service.spec.ts`, `clients.controller.spec.ts`): 11 suítes aprovadas, 61 testes aprovados; 3 suítes/5 testes de banco ignorados pelas condições existentes. A execução ampliada inicial reproduziu as falhas de injeção dos dois testes esqueleto, cuja ausência de mocks também está presente no HEAD. Não foram alterados.
