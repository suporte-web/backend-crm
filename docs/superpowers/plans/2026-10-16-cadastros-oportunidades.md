# Plano de implementação: Cadastros e Oportunidades

> Execução nesta conversa, conforme autorização da usuária para fazer todas as modificações. Habilidades: executing-plans, test-driven-development e verification-before-completion.

**Objetivo:** unificar a navegação de Clientes e Leads, preservar os cadastros completos e centralizar Oportunidades/Propostas.

**Arquitetura:** cadastro compartilhado em Client, classificado como CLIENT ou LEAD, vinculado ao Lead comercial. Reaproveitamento dos componentes e contratos existentes, com adaptações transacionais no backend.

**Tecnologias:** NestJS, Prisma/PostgreSQL, Next.js, React e Material UI.

**Especificação:** ../specs/2026-10-16-cadastros-oportunidades-design.md.

## Restrições globais

- Textos, mensagens e documentação novos em português.
- Preservar os dados e as alterações locais dos dois repositórios.
- Não publicar ou executar migrações em produção.
- Manter validação de documento para Cliente e não exigir documento de Lead.
- O funil usa a etapa comercial; a modalidade não substitui essa etapa.

## Pontos de revisão

- Lead convertido não gera uma segunda linha ou nova oportunidade.
- Novos leads de importação, site e WhatsApp recebem o mesmo cadastro completo.
- Classificação não altera o campo legado modality nem cria acesso ao portal.
- Permissões antigas e limites de responsável permanecem válidos por registro.
- Metadados, documentos, contatos e links antigos sobrevivem à reorganização.

### Tarefa 1: Dados e sincronização

Arquivos: schemas Client/Lead, nova migração, `src/common/cadastros.ts` e testes.
Interface: `garantirCadastroLead(tx, lead)` retorna o cadastro vinculado, sem converter o lead.

- [x] Criar testes para criação, associação idempotente e preservação dos metadados; executar e observar a falha inicial.
- [x] Adicionar classificação e vínculo canônico, migração dos registros antigos e sincronização compartilhada.
- [x] Gerar Prisma e executar os testes da sincronização.

### Tarefa 2: API de Cadastros e conversão

Arquivos: novo módulo cadastros; módulos leads, clientes e solicitações do site.
Interfaces: GET/POST `/cadastros`, GET `/cadastros/:id`, PATCH `/cadastros/:id/modalidade` e resolução `/cadastros/lead/:id`.

- [x] Testar validação, acesso por origem, promoção sem duplicar cadastro e retorno a Lead.
- [x] Implementar criação completa, detalhes, classificação transacional e adaptadores dos canais existentes.
- [x] Preservar APIs de contatos/documentos e excluir cadastros LEAD das consultas de clientes/BI.
- [x] Executar testes pertinentes e build do backend.

### Tarefa 3: Interface de Cadastros

Arquivos: novas páginas e serviço de cadastros; formulário/detalhes de clientes; tipos; sidebar e telas.
Interface: `/cadastros` e `/cadastros/:id` usando os componentes atuais.

- [x] Implementar lista única, filtro de modalidade, criação completa e seletor Cliente/Lead.
- [x] Reutilizar detalhes, contatos, documentos e informações comerciais; incluir dados legados de Lead e histórico.
- [x] Conservar destinos antigos e permissões por origem; validar TypeScript.

### Tarefa 4: Oportunidades/Propostas

Arquivos: páginas `/oportunidades`, serviço de consulta, detalhes e componentes atuais de propostas; serviço de oportunidades.
Interface: lista central com cadastro vinculado; edição usando o mesmo formulário existente.

- [x] Implementar filtros, seleção de Cliente/Lead e navegação para criação/edição de propostas.
- [x] Mover o acesso de edição para a nova área e manter atalho no cadastro.
- [x] Verificar limites de responsável também nas mutações por ID.
- [x] Preservar opções e anexos por reutilização do formulário; compilação aprovada. Validação visual autenticada pendente da migração.

### Tarefa 5: Validação final

- [x] Executar os testes novos e regressões pertinentes, build backend e TypeScript frontend.
- [x] Executar a suíte do backend e registrar falhas preexistentes por nome.
- [x] Revisar alterações nos dois repositórios, migração, permissões e português da interface.
- [x] Registrar os comandos de preparação/publicação e limitações de verificação, sem publicar.

## Estado final da execução

Código implementado e validado por compilação, testes relacionados e revisão independente. A suíte completa mantém falhas em testes antigos, discriminadas no relatório `docs/validacao-cadastros-oportunidades-2026-10-16.md`.

- [ ] Aplicar migração ao banco local: bloqueada pela revisão automática; requer autorização específica da usuária.
- [ ] Validar visualmente os fluxos autenticados com dados reais após a migração.

As alterações locais preexistentes foram preservadas. A execução permaneceu nas cópias atuais porque a entrega precisava incorporar esses componentes já modificados. Nenhuma publicação ou commit foi realizado.
