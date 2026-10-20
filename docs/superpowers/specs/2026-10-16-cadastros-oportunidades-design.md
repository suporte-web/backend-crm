# Cadastros unificados e Oportunidades/Propostas

Data: 16/10/2026.
Estado: especificação aprovada; código implementado. Aplicação da migração no banco local pendente de autorização específica após bloqueio da revisão automática.

## Objetivo aprovado

Substituir os acessos separados de Clientes e Leads por Cadastros no sidebar. Permitir escolher a modalidade Cliente ou Lead e continuar operando o funil de vendas. Separar Oportunidades/Propostas em um acesso próprio no sidebar, vinculado aos registros de Cadastros. Preservar as informações, formulários e operações existentes.

## Contexto verificado

- O backend usa NestJS e Prisma. O frontend Next.js está em `../frontend-crm/frontend-crm`.
- `Client` já possui cadastro empresarial, contatos múltiplos, condições comerciais, documentos, histórico, oportunidades e vínculos com propostas, cotações e chamados.
- `Lead` possui origem, dados de contato, informações adicionais em `metadata`, anexos, observações, histórico e situação no funil.
- A conversão atual cria `Client.sourceLeadId`, marca `Lead.convertidoParaCliente` e registra `metadata.clientId`. Ela exige documento e avança o lead para `venda_efetivada`.
- `Opportunity.clientId` é obrigatório. O formulário Oportunidade/Proposta está nos detalhes do cliente e usa oportunidades e documentos. Existe também o fluxo de propostas de chamados, com versão, aprovações e envio próprios; os dois precisam continuar funcionando.
- `Client.modality` já existe. A nova classificação Cliente/Lead terá campo próprio, sem sobrescrever o conteúdo desse campo legado.
- Os dois repositórios possuem alterações locais, inclusive nos componentes de propostas, documentos, sidebar e permissões. A implementação deve incorporá-las sem descartá-las.

## Abordagem

Usar `Client` como estrutura compartilhada de cadastro, com classificação explícita `modalidadeCadastro: CLIENTE | LEAD`. Manter `Lead` como registro comercial de origem e acompanhamento no funil, ligado ao cadastro por `sourceLeadId` e por uma referência canônica única no lead.

Essa abordagem reaproveita contatos, documentos e o vínculo atual de oportunidades com cadastros. Evita replicar esses subsistemas dentro de Lead. A alternativa de ampliar separadamente todas as estruturas de Lead duplicaria formulários e regras; a fusão destrutiva das tabelas exigiria migrar relações de chats, chamados, importações e históricos sem necessidade para a mudança pedida.

Os nomes técnicos existentes não determinam a modalidade exibida ao usuário. Um registro `Client` classificado como LEAD não representa venda, cliente convertido ou autorização de acesso ao portal.

## Experiência de uso

### Sidebar e navegação

- Em Comercial, substituir Clientes e Leads por Cadastros, com destino `/cadastros`.
- Adicionar Oportunidades/Propostas, com destino `/oportunidades`.
- Manter Funil de Vendas e os demais itens existentes.
- Preservar os endereços antigos por redirecionamentos ou adaptadores, incluindo detalhes e links de propostas. Um endereço antigo de lead resolve o cadastro vinculado sem criar conversão comercial.
- No cadastro, substituir a edição de oportunidades em aba por um atalho para Oportunidades/Propostas já filtrado pelo cadastro. Conservar os indicadores e o histórico relacionados.

### Cadastros

- Uma lista reúne os cadastros existentes e os leads ainda não convertidos, com busca e filtro por modalidade. Exibir nome/empresa, identificação disponível, contato principal, responsável e modalidade.
- Novo cadastro e edição permitem escolher Cliente ou Lead. Os detalhes reaproveitam o visual atual, com Visão geral, Cadastro, Contatos, Condições comerciais, Documentos e Histórico.
- Preservar todos os campos existentes dos dois tipos, inclusive origem, segmento, transporte, armazenagem, datas, estimativa mensal, próxima ação e demais metadados do lead.
- Contatos múltiplos, contato principal, observações, WhatsApp e LinkedIn continuam disponíveis. Não reduzir um cadastro a somente nome, telefone e e-mail.
- Leads mantêm as validações atuais de lead; não exigir CNPJ para simples cadastro de Lead. A conversão para Cliente mantém a exigência atual de documento.
- Exibir a classificação como Modalidade do cadastro, com Cliente e Lead. Preservar separadamente o campo legado `modality` e seu valor.

### Oportunidades/Propostas

- Lista central de todas as oportunidades acessíveis ao usuário, identificando o cadastro e sua modalidade.
- Busca e filtros por cadastro, modalidade, etapa e situação; o seletor de cadastro inclui Clientes e Leads permitidos ao usuário.
- Reaproveitar os campos e operações atuais: criar, visualizar, editar, excluir conforme as regras atuais, valores, etapas, previsão de fechamento, pré-contrato, configurações da proposta e documentos.
- Preservar integralmente as opções de transporte/armazenagem e os dados atualmente gravados pelo formulário, inclusive informações armazenadas em campos textuais.
- Reaproveitar o fluxo específico de propostas de chamados quando aplicável, sem inventar chamado para uma oportunidade que não o exige hoje. Manter versões, anexos e decisões existentes.
- Ao mudar Lead para Cliente, as oportunidades permanecem com os mesmos IDs e o mesmo cadastro vinculado.

## Dados e compatibilidade

1. Adicionar enum `ModalidadeCadastro` e `Client.modalidadeCadastro`, com padrão CLIENTE para os clientes já existentes.
2. Adicionar `Lead.cadastroId` opcional e único, referenciando o cadastro canônico. Essa referência identifica o cadastro na navegação; `sourceLeadId` continua preservando a origem.
3. Associar leads convertidos ao cliente indicado em `metadata.clientId`, desde que o vínculo seja válido. Na ausência dessa referência, usar `sourceLeadId` quando houver exatamente um cliente correspondente.
4. Para leads sem cadastro vinculado, criar um cadastro LEAD, preservando as datas e informações originais. Criar o contato principal somente quando houver dados e sem duplicar contatos existentes.
5. Quando houver múltiplos clientes candidatos e nenhuma referência inequívoca, registrar a inconsistência e interromper a associação desse lead para revisão. Não escolher um cliente por semelhança de nome ou por data.
6. Executar a preparação de dados em operação idempotente e transacional por registro. Reexecutar não pode gerar novos cadastros ou contatos para um lead já vinculado.
7. Preservar os IDs de clientes, leads, oportunidades e propostas existentes. Não apagar tabelas, anexos, metadados, observações ou históricos.
8. Consultar os anexos e históricos legados do lead a partir do vínculo. Novos documentos do cadastro usam a estrutura compartilhada; downloads antigos continuam válidos.

Leads criados por formulário antigo, importação, site ou WhatsApp também devem receber o cadastro vinculado. Não basta cobrir somente o novo formulário. As APIs antigas continuam aceitando os contratos atuais; a sincronização ocorre no backend em serviços compartilhados.

## Modalidade e funil

- Separar modalidade do cadastro, situação cadastral e etapa do funil. Não gravar Cliente/Lead no campo `Lead.status`.
- Criar um Lead gera o cadastro LEAD e um único registro de funil, na etapa padrão atual.
- Converter Lead para Cliente promove o cadastro já vinculado em vez de criar outro. Preservar a validação de documento, a auditoria e o avanço para `venda_efetivada` do fluxo atual.
- Trocar Cliente para Lead preserva o cadastro, oportunidades e histórico. Reutilizar o lead de origem ou criar um único lead vinculado quando ele não existir; marcar como não convertido. Preservar a etapa anterior quando existir, e usar a entrada padrão para um lead novo. A etapa continua editável pelo fluxo atual.
- Criar Cliente diretamente mantém o comportamento atual de criação de cliente; não inventar uma venda ou oportunidade.
- Não criar usuário de portal nem conceder acesso por mudar a modalidade.
- A listagem unificada não exibe novamente o lead de origem de um cliente convertido. O histórico de conversões continua acessível nos detalhes.
- Ajustar consultas de carteira, resumos, BI e funil para que cadastros LEAD não entrem como clientes e leads convertidos não sejam contados duas vezes. Preservar o tratamento legado dos clientes sem lead de origem.

## Organização da implementação

- Backend: serviço de cadastros para classificação, associação e atualização transacional; DTOs explícitos e rotas `/cadastros` para lista, detalhes, criação, edição e mudança de modalidade.
- Reutilizar serviços de contatos/documentos de clientes, com verificação de acesso ao cadastro. Consolidar os detalhes com os dados legados do lead sem substituir objetos `metadata` por versões parciais.
- Adaptar criação e conversão de leads e clientes para usar o mesmo serviço de sincronização, evitando dependências circulares entre módulos.
- Oportunidades continuam vinculadas a `Client.id`, agora representando um cadastro de qualquer modalidade. Expor a modalidade e o nome do cadastro na consulta e aceitar filtro de modalidade validado.
- Frontend: páginas de Cadastros e Oportunidades/Propostas, serviços e tipos correspondentes; extrair os formulários atuais para componentes reutilizáveis mantendo o desenho e as alterações locais existentes.
- Atualizar registro de telas, ícones, sidebar, autorização por rota e permissões por perfil dos dois lados. A migração de permissões deve manter o acesso de cada origem: uma permissão de lead não concede automaticamente leitura dos clientes e vice-versa. A consulta e as ações respeitam essas diferenças.
- Manter os limites atuais por perfil e responsável, inclusive na seleção de cadastros para oportunidades. Não ampliar acesso comercial por unificar a listagem.

## Erros e consistência

Rejeitar classificação inválida, cadastro inexistente, documento duplicado e vínculo incoerente com mensagens específicas. Falhas em criação, conversão ou sincronização devem reverter toda a transação. Não fechar formulários nem limpar dados digitados quando uma requisição falhar. Registrar mudanças de modalidade e criação/edição de oportunidades nas estruturas de auditoria e histórico existentes.

## Verificação e critérios de aceite

- Conferir build e TypeScript dos dois projetos e executar os testes pertinentes aos fluxos alterados.
- Cobrir criação de Lead com contatos múltiplos, associação idempotente de leads antigos e criação por canais legados.
- Cobrir conversão sem duplicar cadastro, contato ou oportunidade; rejeição de documento duplicado; retorno a Lead; preservação dos metadados e da etapa definida.
- Cobrir filtros de oportunidades para ambas as modalidades e acesso restrito por perfil/responsável, incluindo tentativas por ID direto.
- Conferir contagens do funil/BI para lead ativo, lead convertido, cliente direto e cliente reclassificado.
- Verificar visualmente sidebar, busca, detalhes, formulários de contatos e oportunidades, anexos, mensagens de erro e links antigos.
- Comparar os dados antes/depois em uma base de teste: mesmos registros e arquivos antigos, com apenas os cadastros LEAD e vínculos necessários adicionados.

## Limites da entrega

Não redesenhar o sistema, remover campos, alterar etapas comerciais ou fundir empresas por semelhança. Não publicar em produção nem executar a preparação de dados em produção como parte da edição de código. O frontend está fora das raízes atualmente graváveis; qualquer edição nele deverá usar o mecanismo de autorização do ambiente quando necessário.

Próxima etapa após revisão desta especificação: elaborar o plano de implementação e definir sua execução, conforme o fluxo de planejamento adotado.
