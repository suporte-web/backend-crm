# Previsão no monitoramento de entregas por placas

O monitoramento cruza documentos e eventos KMM com CTRCs SSW. A fonte do prazo é `public.ctrc.data_prev_ent`, na conexão configurada por DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD e operada pelo PostgresDeliveriesService. A previsão pertence ao CTRC, não à data de atualização/evento KMM.

A consulta simples por placa já retornava esse campo. A consulta cruzada `buildCtrcsSswPorNfQuery` agora também o retorna, em `YYYY-MM-DD`, mantendo o dia do campo DATE sem conversão de fuso horário.

## Regra escolhida

Para cada rota/romaneio, `data_prev_ent` na resposta do monitoramento é a menor previsão dos documentos pendentes. Um documento considerado entregue pela regra existente (algum CTRC vinculado com data_entrega preenchida) sai do cálculo. Previsões anteriores ao dia consultado continuam aparecendo: uma previsão vencida não deve ser substituída pela data do evento ou do monitoramento.

Quando não há previsão válida, o campo é null. `pendentes_sem_previsao` informa a quantidade de documentos pendentes sem data válida, incluindo aqueles sem nota mínima ou sem correspondência SSW. Assim, a menor previsão conhecida não oculta lacunas na carteira. Se todos os documentos estiverem entregues, não há previsão pendente.

A coluna “Prazo para Entrega” mostra a data, “Sem previsão” ou “Concluídas”, além da contagem de pendentes sem previsão. A contagem de entregues/faltantes, seleção de rotas, filtros e cálculo de atraso existentes não foram alterados.

## Campos conferidos

Na estrutura do banco SSW consultada em 24/11/2026, estes campos são do tipo DATE: `data_ref`, `data_prev_ent`, `data_entrega`, `data_prev_ent_fil_dest`, `data_pre_entrega` e `data_ult_ocor`. Não há descrições cadastradas nas colunas que confirmem a semântica das alternativas `data_prev_ent_fil_dest` e `data_pre_entrega`; elas não são usadas como fallback. O código existente usa `data_entrega` para realização e `data_ult_ocor` para ocorrência.

O vínculo KMM–SSW continua usando a nota mínima e a série BET, com deduplicação pelo seq_ctrc. Se uma nota corresponder a vários CTRCs pendentes, considera-se a menor previsão entre eles, mantendo o critério de contagem existente por documento KMM. A revisão da chave de vínculo é uma mudança independente.

As consultas de validação realizadas no banco foram somente de leitura da estrutura e descrições; não houve gravação nem migração.
