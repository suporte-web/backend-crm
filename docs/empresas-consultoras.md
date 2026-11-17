# Empresas consultoras

## Modelo e acesso

`EmpresaConsultora` tem nome, CNPJ opcional e único, situação ativa e datas.
`User.empresaConsultoraId` identifica a empresa da conta, e
`Client.empresaConsultoraId` identifica a empresa da carteira. Ambos são opcionais
no banco para preservar os dados existentes. O responsável individual continua
em `Client.responsavelId`; autoria e prospecção não autorizam o acesso.

O perfil CONSULTORA pode visualizar e editar os cadastros da própria empresa
ativa, inclusive os de colegas ou sem responsável individual. Sem vínculo ativo,
o acesso à carteira é negado. Outros perfis preservam suas regras anteriores.
O BI filtra obrigatoriamente pela empresa e permite selecionar um consultor dela.
Oportunidades continuam dependendo da permissão de tela e respeitam a empresa.
Detalhes, edições, observações, leads e anexos aplicam a mesma restrição.

Os dados atuais da conta e a atividade da empresa são carregados do banco em cada
autenticação JWT. O corpo da requisição e um token antigo não definem a empresa.

## Administração

Em Administração → Empresas consultoras (`/empresas-consultoras`), Admin e Gestão
podem criar/editar/inativar empresas, vincular e desvincular contas CONSULTORA e
administrar a carteira. Consultoras não administram empresas ou vínculos, mesmo
quando combinadas com outro perfil em dados legados.

Cada conta pertence a no máximo uma empresa. Mover uma conta não transfere seus
cadastros: a carteira permanece explicitamente vinculada à empresa anterior.
Responsáveis individuais podem ser alterados entre consultores da mesma empresa.
Transferir o cadastro a outra empresa exige a ação administrativa própria; ela
remove o responsável incompatível e audita os valores anteriores. Não altera
autoria, prospecção ou textos históricos. Empresas são inativadas, não excluídas;
as chaves estrangeiras também impedem excluir uma empresa com vínculos.

## Primeiro cadastro e carteira existente

1. Cadastrar a empresa na tela de Empresas consultoras.
2. Criar as contas em Usuários com perfil CONSULTORA, se ainda não existirem.
3. Vincular as contas à empresa.
4. Conferir os registros pendentes na carteira: são cadastros sem empresa, cujo
   responsável individual está vinculado à empresa selecionada.
5. Usar **Conferir vínculos pendentes** e revisar a tabela. A simulação não grava.
6. Usar **Aplicar vínculos** e confirmar. O servidor revalida cada ID dentro da
   transação; se algum vínculo mudou, rejeita o lote inteiro.

Cadastros sem responsável podem ser vinculados individualmente pelo seletor
administrativo. Não há inferência por nome nem vínculo automático dos dados
antigos. Novos cadastros criados por consultores recebem a empresa do responsável
validado, limitada à empresa do usuário autenticado.

## API

Todas as rotas exigem JWT, Admin/Gestão e ausência de perfil CONSULTORA.

| Método | Caminho | Finalidade |
| --- | --- | --- |
| GET / POST | `/empresas-consultoras` | Listar / criar |
| PATCH | `/empresas-consultoras/:id` | Editar / inativar |
| GET | `/empresas-consultoras/usuarios` | Contas CONSULTORA disponíveis |
| PATCH | `/empresas-consultoras/:id/usuarios/:usuarioId` | `{ vincular: boolean }` |
| GET | `/empresas-consultoras/:id/carteira` | Carteira vinculada e pendências |
| POST | `/empresas-consultoras/:id/carteira` | `{ cadastroIds, aplicar?: boolean }`, simulação por padrão |
| PATCH | `/empresas-consultoras/cadastros/:cadastroId/empresa` | `{ empresaConsultoraId: UUID ou null }` |

As mudanças administrativas e os vínculos da carteira são auditados na mesma
transação serializável das alterações.

## Publicação

O código depende da migration `20261118100000_empresas_consultoras`:

```sh
npm run prisma:generate
npx prisma migrate deploy
npm run build
```

Aplicar a migration no banco de destino antes de iniciar o novo backend. Publicar
backend e frontend compatíveis, cadastrar a empresa, vincular as contas e aplicar
a carteira conferida. CONSULTORA sem empresa/carteira vinculada não terá acesso
aos dados até concluir essa configuração. Nenhuma empresa ou conta de produção
é criada automaticamente; o nome da empresa e os usuários precisam ser informados.

## Validação

Os testes cobrem compartilhamento, isolamento, perfis combinados, empresa inativa,
responsável de outra empresa, prévia sem escrita, transferência e auditoria.
`BI_TESTAR_BANCO=1` habilita `bi-comercial.integration.spec.ts` apenas para URL local.
O teste valida a migration quando ainda não aplicada e reverte DDL e dados ao final.
