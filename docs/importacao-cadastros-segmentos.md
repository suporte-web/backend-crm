# Importação de cadastros e segmento por CNAE

## Uso na tela de Cadastros

1. Abrir **Importar planilha** e escolher empresa consultora e responsável.
2. Enviar XLSX de até 5 MB. A aba principal precisa ter `CLIENTE` e `EMAIL` ou
   `TELEFONE` na primeira linha. As colunas do arquivo MCG são reconhecidas.
3. Gerar a prévia e conferir erros, possíveis duplicidades, segmentos e etapas.
4. Escolher manualmente as etapas sem correspondência, como NUTRIÇÃO e PIZZATTOLOG.
5. Selecionar até 200 linhas, revisar e confirmar. Um erro reverte o lote inteiro.

Os novos registros são **LEAD**, sem acesso ao portal e sem criar usuários.
Cadastrar uma empresa na planilha não comprova venda, contrato ou conversão.
Os cadastros existentes ficam preservados. Nomes semelhantes, CNPJ, e-mails,
telefones e linhas já importadas geram indicação de possível duplicidade.
Linhas com coincidências ou erros ficam bloqueadas; corrigir a planilha ou
conferir o cadastro existente antes de gerar outra prévia. Para mais de 200
linhas, importar em lotes reenviando o arquivo: as linhas já importadas serão
identificadas. Uma confirmação concluída pode ser repetida sem duplicar dados.

A aba PRIORIDADE complementa somente empresas com correspondência exata e única
de nome normalizado. Prioridades sem correspondência são conservadas no relatório,
sem criar empresas fictícias. Abas de segmentos, fases do funil e metas não são
tratadas como empresas. Os textos MCG, PZT, retorno, segmento e funil originais
ficam no histórico e nos metadados de origem. Datas sem ano não viram eventos
com datas presumidas. Telefones numéricos recebem aviso sobre zeros iniciais.
Fórmulas em linhas de dados são bloqueadas; usar valores na planilha.

## Classificação de segmentos

`Segmento` é o catálogo comercial; `RegraSegmentoCnae` relaciona prefixos a ele.
A regra mais específica vence: subclasse (7), classe (5), grupo (3), divisão (2).
O CNAE é normalizado como texto de sete dígitos, preservando zeros iniciais.
O catálogo inicial contém 27 segmentos e regras de referência. A correspondência
entre CNAE e segmento comercial é configuração do CRM, baseada na hierarquia
oficial; não é uma classificação comercial universal publicada pelo IBGE.

Fonte da hierarquia e dos códigos: https://cnae.ibge.gov.br/documentacao.html e
https://concla.ibge.gov.br/images/concla/documentacao/CNAE20_Subclasses_NotasExplicativas.pdf.

Sem regra, o segmento fica não classificado. Categorias como E-commerce,
Embalagens e Pet podem exigir seleção comercial manual, pois não correspondem
necessariamente a uma única divisão CNAE. Não inferir CNAE pelo nome da empresa.
Os códigos numéricos da aba SEGMENTOS da planilha são internos, não CNAEs.

`Client.segmentoId` referencia o catálogo; `segment` mantém o nome compatível com
os painéis existentes. `segmentoOrigem` distingue CNAE, MANUAL, IMPORTACAO e LEGADO.
Textos anteriores são preservados como LEGADO. Uma nova consulta de CNPJ mantém
o segmento manual escolhido. O seletor **Classificar pelo CNAE** permite voltar
à classificação automática. A descrição completa da atividade fica em
`businessActivity`, sem substituir o segmento padronizado.

## API e manutenção

- `GET /segmentos`: catálogo ativo.
- `GET /segmentos/classificar?cnae=2063100`: classificação local por regra.
- `POST /segmentos`: Admin/Gestão cria segmento com nome e aliases.
- `GET /segmentos/regras` e `POST /segmentos/regras`: gestão das regras.
- `GET /importacoes-cadastros/opcoes`: responsáveis e empresas permitidos.
- `POST /importacoes-cadastros/previa`: multipart com arquivo, responsável e empresa.
- `POST /importacoes-cadastros/:id/confirmar`: linhas com número, etapa e segmento.
- `GET /importacoes-cadastros` e `GET /importacoes-cadastros/:id`: histórico do autor.

A prévia grava somente um relatório temporário; não cria cadastros. Vale uma hora.
O upload não dispara consultas externas de CNPJ em massa. O leitor verifica o
ZIP e os tamanhos efetivamente expandidos antes de carregar o XLSX, limita células,
linhas e tamanho dos dados e não executa fórmulas, macros ou links da planilha.

Somente Admin, Gestão, Comercial e CONSULTORA com permissão de Leads podem
importar. CONSULTORA usa exclusivamente a empresa ativa de sua conta e pode
escolher responsáveis dessa empresa. O backend valida novamente usuário,
empresa, duplicidades e segmentos na confirmação. Correspondências fora da
carteira ou de modalidade sem permissão não expõem identificadores ou nomes
dos registros existentes. Importações de outro autor não são acessíveis.

Lotes são gravados em transação serializável, com auditoria por cadastro e
vínculo ao relatório. A chave da linha de origem previne repetição do mesmo
arquivo, aba, empresa e linha. Erros não deixam parte do lote gravada.

## Migração e publicação

Nova migration: `20261118120000_segmentos_importacao_cadastros`.
Ela adiciona catálogo, regras, origem do segmento, site, chave de importação e
relatórios. Preserva os textos antigos e não importa a planilha automaticamente.

Antes de iniciar o código novo no ambiente de destino:

```sh
npm ci
npm run prisma:generate
npx prisma migrate deploy
npm run build
```

Em produção, usar backup e o fluxo de releases já adotado pelo projeto. A migration
precisa ser aplicada antes de iniciar o backend que utiliza os novos campos.
O limite de upload é 5 MB, inferior ao limite atual de 10 MB do Nginx.

## Testes

Testes de leitura cobrem abas auxiliares, linhas formatadas, fórmulas, e-mails e
limites de ZIP. Testes de segmento cobrem precedência, zeros, sinônimos e escolha
manual. `IMPORTACAO_TESTAR_BANCO=1` habilita o teste de integração apenas com URL
local: aplica DDL pendente dentro da transação de teste e reverte tudo ao final.
Valida prévia sem criar cadastros, lote atômico, repetição da confirmação,
isolamento de carteira, privacidade de duplicidades e expiração.
