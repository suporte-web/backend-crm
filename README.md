<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

## Relatórios GA4 sem Google Cloud

Em **Marketing > Métricas**, a origem padrão é **Importação de CSV (sem Google Cloud)**.
Também há um atalho **Importar relatório do GA4** no cartão de Google Analytics em Integrações.

1. No GA4, selecione a propriedade e o período, abra um relatório detalhado e use **Compartilhar relatório > Fazer download > CSV**.
2. No CRM, informe o nome do relatório, o ID da propriedade (para este site, `283055240`) e o mesmo período da exportação.
3. Selecione o arquivo e clique em **Importar e salvar**. O relatório ficará disponível para Marketing e Administração.

O CSV deve estar em UTF-8, com vírgula ou ponto e vírgula como separador, uma tabela com cabeçalhos distintos, no máximo 50 colunas, 5.000 linhas e 2 MB. Metadados de exportação iniciados com `#` são ignorados, enquanto valores de dimensões como `#Campaign` são preservados. Arquivos vazios, malformados ou com múltiplas tabelas são rejeitados sem salvar dados. PDF e XLSX não são suportados nesta importação.

Os valores são exibidos como exportados, sem somar usuários ou inferir métricas ausentes. O período e a propriedade são declarados pelo usuário na importação. O CRM mostra a origem manual e a data de importação; novas métricas precisam de uma nova exportação e importação. A consulta lista as 100 importações mais recentes e pagina cada tabela em 25 linhas. Este fluxo não muda as tags do site nem indica uma conexão OAuth ativa.

### Banco e publicação

A tabela `MarketingManualReport` é criada pela migração `20261006160000_marketing_manual_reports`.
Para publicar em outro ambiente, inclua frontend e backend, gere o cliente Prisma, confira as migrações pendentes e aplique a migração antes de iniciar a versão nova:

```sh
npx prisma generate
npx prisma migrate status
npx prisma migrate deploy
```

O banco local recebeu esta migração em 06/10/2026. Nenhuma publicação em servidor foi feita nesta alteração.

### Validação da alteração — 06/10/2026

- TypeScript do frontend e do backend de produção: aprovados.
- Testes da importação (`ga4-csv.spec.ts` e `manual-reports.spec.ts`): 16 aprovados, incluindo leitura de CSV, persistência/consulta via HTTP, arquivos inválidos e restrições de acesso.
- ESLint dos arquivos alterados no backend: aprovado. O frontend não possui `eslint.config.*`, impedindo a execução do ESLint 9 existente.
- A suíte completa do backend apresentou 28 suítes aprovadas, 11 com falhas e 2 ignoradas (141 testes aprovados, 9 com falhas, 3 ignorados). As falhas estão em testes não alterados nesta implementação: `chats/chats.service.spec.ts` (construtor incompleto), `users/users.controller.spec.ts` (arquivo sem testes), e testes com dependências não fornecidas em `tickets/tickets.controller.spec.ts`, `tickets/tickets.service.spec.ts`, `clientes/clients.controller.spec.ts`, `clientes/clients.service.spec.ts`, `quotes/quotes.controller.spec.ts`, `quotes/quotes.service.spec.ts`, `auth/auth.controller.spec.ts`, `auth/auth.service.spec.ts` e `users/users.service.spec.ts`, todos sob `src/modules`.
- Ainda não foi verificada uma exportação real da propriedade nem realizada uma inspeção visual da tela autenticada.
