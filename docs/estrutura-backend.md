# Estrutura do backend

## Organização por módulo

Cada módulo funcional tem uma pasta diretamente em `src/`. Não existe uma pasta intermediária `src/modules/`.

```text
src/
├── main.ts
├── app.module.ts
├── clientes/
│   ├── clients.controller.ts
│   ├── clients.module.ts
│   ├── clients.service.ts
│   ├── clients.service.spec.ts
│   └── dtos/
├── entregas-por-placas/
│   ├── entregas-por-placas.controller.ts
│   ├── entregas-por-placas.module.ts
│   ├── entregas-por-placas.service.ts
│   ├── entregas-por-placas.service.spec.ts
│   ├── dtos/
│   ├── config/
│   └── sql/
├── site-institucional/
├── marketing-integrations/
├── marketing-metrics/
├── prisma/
├── config/
├── common/
└── scripts/
```

A reorganização preserva os nomes existentes de arquivos, classes, rotas HTTP e contratos. Por exemplo, a pasta `clientes` continua contendo `clients.service.ts`. A padronização de idioma e as mudanças de responsabilidade serão tratadas separadamente.

## Responsabilidades

- `*.controller.ts`: entrada HTTP, parâmetros, validação e encaminhamento ao serviço.
- `*.module.ts`: controllers, providers, dependências e operações exportadas.
- `*.service.ts`: operações e regras do módulo.
- `dtos/`: contratos de entrada. Criar a pasta somente quando houver DTOs; não colocar controllers, módulos ou serviços nela.
- `*.spec.ts`: testes próximos ao arquivo correspondente, inclusive testes de DTOs dentro de `dtos/`.
- Pastas como `guards/`, `strategies/`, `sql/`, `policies/` e `providers/`: criar conforme a necessidade do módulo.

Um módulo pode ter vários serviços e controllers quando representam responsabilidades distintas. Não criar arquivos vazios para completar a estrutura e não criar um módulo para cada tabela auxiliar.

## Recursos compartilhados

- `prisma/`: cliente e ciclo de vida da conexão principal do CRM.
- `config/`: configurações técnicas gerais, como Swagger.
- `common/`: recursos usados por vários módulos. Evitar adicionar novas regras específicas de uma funcionalidade; as regras de negócio já presentes serão revisadas em outra etapa.
- `scripts/`: operações executadas explicitamente, fora do fluxo HTTP.

As conexões operacionais PostgreSQL continuam em `deliveries/database/` nesta etapa. O schema e as migrações continuam na pasta `prisma/` da raiz do repositório.

## Dependências e manutenção

1. Registrar o módulo no `AppModule` ou importá-lo pelo módulo consumidor.
2. Manter imports relativos apontando para a nova localização, incluindo testes, mocks e scripts.
3. Exportar apenas os providers necessários aos consumidores.
4. Preservar rotas e contratos durante movimentações estruturais.
5. Conferir caminhos baseados em `__dirname` e scripts que carregam arquivos de `dist/` ao mover arquivos.
6. Atualizar a documentação e executar as verificações antes de concluir uma mudança.

Os documentos históricos em `docs/` e os relatos de validação anteriores no README podem mencionar os caminhos antigos em `src/modules/`. Eles registram a estrutura da época; para localizar o arquivo atual, remover `modules/` e substituir a pasta `dto/` por `dtos/`. Em entregas por placas, controller, module, service e seus testes passaram para a raiz do módulo.

## Verificações

### Documentação da API

A configuração do Swagger fica em `src/config/swagger.ts` e é chamada pelo `main.ts`. A interface está no endereço `/api`, relativo ao servidor do backend. Esse é o endereço da documentação; os prefixos das rotas HTTP são definidos separadamente na inicialização e nos controllers.

Ao documentar uma operação, utilizar `ApiTags` para o módulo, `ApiOperation` para a finalidade da rota e `ApiBearerAuth` quando ela exigir JWT. Nos DTOs, usar `ApiProperty` ou `ApiPropertyOptional`, mantendo nomes, tipos, obrigatoriedade e limites coerentes com os validadores existentes. Os decorators de Swagger descrevem o contrato; a validação continua sendo feita por `class-validator` e `ValidationPipe`.

O SAC é a referência inicial: inclui as 19 operações, filtros de consulta, campos obrigatórios e opcionais, enums, limites e upload multipart. O teste `src/config/swagger.spec.ts` gera o documento OpenAPI sem conectar aos bancos e verifica esses contratos.

### Compilação e testes

```sh
npm run build
npm test -- --runInBand
npx tsc -p tsconfig.build.json --noEmit --incremental false
```

No PowerShell com execução de scripts desabilitada, utilizar `npm.cmd` e `npx.cmd`.

Os testes que usam banco real são habilitados por variáveis específicas (`CADASTROS_TESTAR_BANCO`, `ANEXOS_TESTAR_BANCO`, `SAC_TESTAR_BANCO`, `VISITAS_TESTAR_BANCO` e `PROFILES_TEST_LOCAL_DATABASE`). Manter esses testes desabilitados durante uma reorganização de pastas; sua execução requer um banco de teste apropriado.

Esta etapa altera organização e referências de arquivos. Não envolve migrações, conversão de dados ou execução de scripts de sincronização/publicação.

## Validação da reorganização — 16/11/2026

- 29 pastas de módulos movidas de `src/modules/` para `src/`; incluindo a padronização de DTOs, 280 arquivos mudaram de caminho.
- 365 referências locais ajustadas em código e testes; os scripts que carregam código compilado também foram atualizados.
- Comparação dos 334 arquivos originais com os destinos: código preservado, considerando as referências equivalentes e o ajuste de `__dirname` no teste que lê uma migração. Os 40 controllers mantiveram seus contratos e implementação.
- `git diff --check`: aprovado.
- Build e verificação de tipos: permanecem os mesmos 25 erros anteriores à reorganização (24 ocorrências de TS1272 e uma de TS2345). A comparação da verificação de tipos não identificou novos erros.
- Jest: 71 suítes aprovadas, 11 com falhas e 6 ignoradas; 480 testes aprovados, 16 com falhas e 9 ignorados. Os resultados de cada suíte e teste foram comparados com uma cópia do código anterior e permaneceram iguais.
- A instalação local não resolve `jest-util` pelo comando padrão. Para a comparação, foi utilizado o pacote já instalado em `node_modules/@jest/core/node_modules`, por meio de `NODE_PATH` definido somente nos processos de teste. As dependências não foram alteradas.
- Testes com banco real permaneceram desabilitados. Não foi validada a inicialização da API conectada aos bancos.

As falhas existentes de compilação, testes e instalação de dependências precisam ser tratadas em uma etapa própria; a reorganização de pastas não as corrige.
