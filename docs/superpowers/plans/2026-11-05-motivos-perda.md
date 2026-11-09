# Motivos de perda — plano de implementação

Objetivo: classificar perdas no CRM existente e apresentar indicadores reais no BI.
Especificação: documento fornecido pela usuária em 05/11/2026.
Arquitetura: catálogo único no backend, exposto pelo controller atual. Validação compartilhada pelas escritas existentes. Dois campos opcionais incrementais, preservando lostReason legado. Frontend consome o catálogo, sem repetir rótulos.

Restrições: sem alterações no PostgreSQL, sem migrations executadas, sem commits, sem remover funcionalidades ou modificar o fluxo Lead → Prospect → Cliente. Trabalhar nos repositórios organizados, preservando alterações anteriores.

- [x] Testar criação, etapa e status, validação de justificativa, reabertura, histórico e permissões.
- [x] Centralizar catálogo/validação em src/modules/oportunidades/motivos-perda.ts e expor GET /opportunities/motivos-perda (alias /oportunidades).
- [x] Acrescentar motivoPerda/observacaoPerda opcionais ao schema e preparar migration aditiva sem executar. Preservar lostReason para integração/legado.
- [x] Aplicar regras em criar/atualizar/atualizarEtapa e ClientsService.updateOpportunityStatus; registrar antes/depois e autoria em transação.
- [x] Consumir catálogo em componente MUI reutilizável. Integrar seletor real de status, edição das propostas e componente de pipeline existente; preservar detalhes completos.
- [x] Agregar oportunidades únicas por ID no BI, somente status LOST; taxa LOST/(WON+LOST), zero seguro, categoria legada não informada. Aplicar período de criação da oportunidade, explicitado na interface; preservar filtros atuais dos cadastros.
- [x] Executar testes, Prisma validate/generate, TypeScript e builds. Revisar diff e documentar arquivos/endpoints/migration/publicação.

Foco da revisão: chamadas diretas de criação perdida; atualização parcial de perda antiga; códigos arbitrários; justificativa só com espaços; reabertura e histórico anterior; falha da API sem exibir métricas falsas; duplicidade por ID; limites de período em UTC-3.

Resultado detalhado e falhas preexistentes da suíte geral documentados em ../../motivos-perda-oportunidades-2026-11-05.md.
