# Gestão de Visitas — desenho aprovado
Implementar frontend e backend no par dentro de repositório/frontend-crm, conforme aprovação em 07/10/2026.
Reutilizar Client, User, perfis múltiplos, autenticação, anexos privados, notificações e AtendimentoSac.
Rotas frontend /atendimento/visitas, /nova e /[id]. Interface MUI em português com ações #ff5805.
Persistir VisitaCliente, participantes, realizações, validações, reagendamentos, histórico e anexos por etapa.
AGENDADA → AGUARDANDO_REALIZACAO → AGUARDANDO_VALIDACAO → POS_VISITA → CONCLUIDA ou ATENDIMENTO_SAC.
Reagendamento permitido durante agendamento/realização ou devolução pela gestão; datas anteriores são registros imutáveis.
Ajuste devolve para realização, mantendo registros anteriores. Reagendamento exige motivo e nova data.
ADMIN, GESTAO e LIDER_ATENDIMENTO administram e validam. ATENDIMENTO lê/executa apenas suas visitas.
Criar/atribuir visita é ação de liderança. Consultas de clientes para seleção são limitadas à liderança.
Pós-visita com SAC cria Ticket de origem VISITA e AtendimentoSac pelo serviço atual, na mesma transação da avaliação.
SAC mantém seu protocolo SAC-AAAA-NNNNNN e vínculo bidirecional. A visita só conclui após SAC CONCLUIDO.
Protocolo de visita usa sequência PostgreSQL, sem contagem de linhas. Concorrência protegida por transações serializáveis.
Histórico guarda autor/data/status e snapshots dos campos alterados. Relações históricas usam Restrict.
Participantes externos não recebem e-mail automático; comunicação fica PENDENTE. Não registrar envio inexistente.
Anexos usam helpers existentes de validação por assinatura, armazenamento privado e download autenticado.
Validação/consulta sempre verifica autorização no backend. DTOs rejeitam campos inválidos.
Não executar migrations no banco sem verificar ambiente; entregar SQL e instrução para prisma migrate deploy.
Preservar alterações locais existentes no frontend.
