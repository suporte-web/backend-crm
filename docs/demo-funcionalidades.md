# Demo de funcionalidades

Este roteiro prepara uma apresentacao guiada do CRM usando dados ficticios. A ideia e apresentar jornadas completas por perfil, nao apenas telas isoladas.

## Preparar o ambiente

1. Confirme que o banco local esta rodando e que o `.env` aponta para a base correta.
2. Rode as migrations, se necessario.
3. Execute:

```bash
npm run seed:demo
```

O script e idempotente: ele cria ou atualiza registros demo identificaveis, sem apagar dados reais.

## Usuarios demo

Todos usam a senha `123456`.

| Perfil | E-mail |
| --- | --- |
| Admin | `admin.demo@crm.com` |
| Gestao | `gestao.demo@crm.com` |
| Comercial | `comercial.demo@crm.com` |
| Marketing | `marketing.demo@crm.com` |
| Cliente | `cliente.demo@crm.com` |

## Roteiro recomendado

### 1. Visao geral como Admin

Entre com `admin.demo@crm.com`.

Mostre:
- dashboard empresarial;
- usuarios e perfis;
- permissoes de telas;
- clientes;
- tickets;
- cotacoes;
- propostas;
- auditoria/logs, se a tela estiver disponivel no frontend.

Mensagem para o usuario: o Admin enxerga a operacao completa e consegue apoiar Comercial e Gestao.

### 2. Fluxo comercial por ticket

Entre com `comercial.demo@crm.com`.

Mostre:
- lista de tickets;
- ticket `Demo - cotacao refrigerada para cliente ativo`;
- cotacao vinculada `COT-DEMO-001`;
- proposta `PROP-DEMO-001`;
- envio ou ajuste de pre-proposta, quando quiser demonstrar a acao ao vivo;
- ticket `Demo - entrada do site qualificada`, para mostrar a Central de Entradas e o fluxo de prospect.

Mensagem para o usuario: o Comercial recebe demandas, qualifica entradas, cria cotacao e conduz a negociacao.

### 3. Experiencia do cliente

Entre com `cliente.demo@crm.com`.

Mostre:
- Canal do Cliente/dashboard;
- tickets do cliente;
- cotacoes;
- proposta enviada;
- mensagens do ticket;
- aprovar, recusar ou pedir ajuste, se a tela permitir a acao no ambiente demo.

Mensagem para o usuario: o cliente acompanha tudo pelo portal, sem depender de e-mail solto.

### 4. Aprovacao da Gestao

Entre com `gestao.demo@crm.com`.

Mostre:
- ticket `Demo - negociacao aguardando gestao`;
- detalhes da negociacao;
- aprovar, recusar ou solicitar ajuste;
- notificacoes e historico.

Mensagem para o usuario: a Gestao valida negociacoes antes da conclusao comercial.

### 5. Conteudo e ajuda

Entre com `marketing.demo@crm.com`.

Mostre:
- conteudo `Comunicado Demo para Clientes`;
- artigo de ajuda `Como acompanhar uma cotacao`;
- leitura de clientes/dashboard, se liberado no frontend.

Mensagem para o usuario: Marketing e atendimento conseguem manter comunicados e apoio ao cliente.

## Dados criados

- Cliente ativo: `Transportes Demo Ltda`.
- Lead: `Lead Demo Industria Norte`.
- Prospect: `Prospect Demo Comercio Sul`.
- Cotacoes: `COT-DEMO-001` e `COT-DEMO-002`.
- Tickets: `DEM-TIC-001`, `DEM-ENT-001`, `DEM-GES-001`.
- Proposta: `PROP-DEMO-001`.
- Conteudo publicado e artigo da Central de Ajuda.

## Dicas de apresentacao

- Abra o sistema em duas abas: uma para perfil interno e outra para cliente.
- Comece pelo problema de negocio: solicitacao, atendimento, proposta, aprovacao.
- Evite explicar banco, API ou detalhes tecnicos para usuario final.
- Use os perfis demo para mostrar limites de acesso.
- Depois da apresentacao, rode novamente `npm run seed:demo` se quiser restaurar os dados principais.
