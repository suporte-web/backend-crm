# Gestão de Visitas Implementation Plan
> Execução nativa nesta sessão, autorizada pelo usuário. Usar executing-plans, testes e verificação.
**Goal:** disponibilizar Gestão de Visitas completa dentro de Atendimento.
**Architecture:** módulo NestJS com relações Prisma e transações, API consumida por Next.js/MUI; SAC reutilizado.
**Tech Stack:** Prisma/PostgreSQL, NestJS, Next.js, MUI.
**Spec:** ../specs/2026-10-07-gestao-visitas-design.md
## Global Constraints
Preservar SAC/clientes/usuários e alterações locais. Português, responsividade, small, #ff5805.
Sem histórico sobrescrito, sem avanço fora de ordem e sem autorização só no frontend.
## Review Focus
Acesso de atendente a visita alheia; ações fora de ordem; custo/melhoria condicionais;
SAC duplicado ou parcial; reagendamentos/revisões preservados.
## Tarefas
- [x] 1. Prisma: VisitaCliente.prisma, relações User/Client/AtendimentoSac e EntradaOrigem.VISITA. Gerar SQL e validar schema.
- [x] 2. Backend: policy.spec.ts RED, política de roles/status GREEN; service.spec.ts RED, service/controller/DTO/module GREEN. Criar SAC transacional pelo serviço existente; tsc após etapa.
- [x] 3. Frontend: types/visitas.ts e services/visitas.api.ts; tsc.
- [x] 4. Listagem e nova visita: filtros, cards, paginação, cliente/CNPJ, responsável e participantes; tsc.
- [x] 5. Detalhe: cabeçalho/etapas/abas/dados; tsc.
- [x] 6. Realização: relatos, custo, fotos e reagendamento; tsc.
- [x] 7. Validação: resumo e aprovação/ajuste/reagendamento; tsc.
- [x] 8. Pós-visita: avaliação, SAC opcional e conclusão; tsc.
- [x] 9. SAC: links bidirecionais; tsc e regressão SAC.
- [x] 10. Anexos/histórico: componentes compartilhados e upload existente; tsc.
- [x] 11. Verificação: build, Jest, testes de interface disponíveis, revisão de diff e documentação de implantação.
## Decisões
Trabalhar nas cópias aprovadas pelo usuário; preservar trabalho local. Não criar worktree para não perder estado em edição.
Erro preexistente chats.service.spec.ts:19 corrigir dependência de NotificationsService na fixture.
