# Visualização MCG pela consultora

Regra confirmada pela usuária em 12/11/2026: ampliar a leitura dos cadastros com responsável MCG, independentemente da autoria. Preservar acessos anteriores e permissões de alteração. Nas oportunidades, a consultora vê somente as criadas por ela e vinculadas a cadastro MCG; Comercial mantém sua visualização, incluindo essas oportunidades. Preservar telas e desenho existentes.

Abordagem: reutilizar `Lead.metadata.responsible` e os eventos `OPPORTUNITY_CREATED`, que já registram autor e identificador da oportunidade na mesma transação. Evitar migração e reatribuição de cadastros. Alternativa de filtrar apenas pelo responsável interno foi descartada por não distinguir oportunidades de autores diferentes no mesmo cadastro. Criar coluna de autoria exigiria migração e preenchimento histórico desnecessários neste ajuste.

Aplicar filtros no servidor, inclusive por ID, detalhes, históricos e indicadores. Uma oportunidade sem evento de autoria comprovada não será exibida à consultora. Respeitar bloqueios de telas já existentes. MCG é o texto confirmado; MGC foi erro de digitação.
