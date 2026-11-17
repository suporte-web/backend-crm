# BI Comercial por responsável

## Modelo

`Client.responsavelId` referencia `User.id` pela relação `ResponsavelComercialCadastro`.
O nome é obtido da relação a cada consulta. `internalOwnerId`, `createdById` e
`prospectedById` conservam seus significados e não substituem o responsável do BI.
Excluir um usuário desvincula o responsável (`ON DELETE SET NULL`), preservando o cadastro.

O texto antigo `Lead.metadata.responsible` é conservado para consulta e migração,
mas nunca identifica o usuário autorizado. Cadastros sem `responsavelId` não aparecem
no BI de uma consultora, mesmo quando ela é criadora ou prospectadora.

A mesma regra vale para a listagem de Cadastros, seus detalhes e os acessos
relacionados a cadastros em Oportunidades. Para Consultora, somente
`responsavelId = usuário autenticado` libera o registro; vínculos históricos e
cadastros sem responsável não liberam acesso. Os demais perfis mantêm suas
permissões e consultas atuais, sem esse filtro obrigatório.

## Acesso e consulta

`GET /bi-comercial` exige JWT e perfil Admin, Gestão, Comercial ou Consultora.
A permissão de tela `commercialBi` pode bloquear o acesso explicitamente.
Consultora tem essa tela disponível por padrão, sempre com o escopo restrito.

- Consultora: escopo obrigatório `responsavelId = usuário autenticado`. Outro ID ou
  `semResponsavel=true` resulta em 403. A lista de responsáveis contém apenas ela.
- Demais perfis permitidos: podem omitir o filtro, enviar `responsavelId=<uuid>` ou
  `semResponsavel=true`. Os dois filtros não devem ser combinados.
- As modalidades Cliente/Lead e as oportunidades continuam respeitando suas
  permissões. Oportunidades seguem o responsável do cadastro, nunca um nome digitado.
- O retorno contém somente os dados necessários ao painel. Metadados livres,
  observações e payloads de integração não são retornados.

O frontend usa `stores/bi-comercial/service.ts`. Os cálculos dos indicadores e os
filtros de período continuam no frontend, aplicados exclusivamente ao recorte
autorizado pelo backend. O filtro de responsável das consultoras fica travado.

## Atribuição

Os formulários de Cadastros e Acompanhamento Comercial enviam `responsavelId`.
O backend valida existência, atividade e perfil comercial do usuário escolhido.
Consultoras não podem transferir a responsabilidade ou remover o vínculo.
Novos cadastros criados pelo fluxo de Cadastros por consultoras são vinculados a elas.

`GET /cadastros/responsaveis` fornece as opções do seletor sem expor e-mails.
Para consultoras retorna apenas o próprio usuário. Um cadastro sem responsável
pode ser atribuído pela gestão; seu texto antigo não é convertido em autorização.

## Migração e levantamento

Em outro ambiente, gerar o cliente Prisma e aplicar a migração
`20261117180000_responsavel_comercial_cadastro` antes de iniciar a versão nova.

```sh
npm run prisma:generate
npx prisma migrate deploy
node scripts/auditar-responsaveis-bi.cjs
node scripts/migrar-responsaveis-bi.cjs
```

O último comando simula a migração. Para aplicar as correspondências únicas:

```sh
node scripts/migrar-responsaveis-bi.cjs --apply
```

A migração de dados aceita apenas um nome normalizado correspondente a um único
usuário ativo elegível. Ambiguidades, usuários não encontrados e nomes ausentes
ficam pendentes. Vínculos existentes nunca são sobrescritos. Cada atribuição é
registrada em `AuditLog`; repetir o comando é seguro. Os relatórios com nomes e
IDs ficam em `.tmp/`, ignorado pelo Git.

## Validação

Os testes de serviço cobrem escopo forçado, tentativa de consultar outra pessoa,
permissões de tela, perfis combinados e validação dos responsáveis. O teste
`bi-comercial.integration.spec.ts` pode ser executado com `BI_TESTAR_BANCO=1`
somente em banco local e reverte todos os dados de teste na transação.
