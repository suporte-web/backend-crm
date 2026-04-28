-- CreateEnum
CREATE TYPE "StatusProposta" AS ENUM (
    'RASCUNHO',
    'ENVIADA_AO_CLIENTE',
    'APROVADA_PELO_CLIENTE',
    'RECUSADA_PELO_CLIENTE',
    'AJUSTE_SOLICITADO_PELO_CLIENTE',
    'ENVIADA_PARA_GESTAO',
    'APROVADA_PELA_GESTAO',
    'RECUSADA_PELA_GESTAO',
    'AJUSTE_SOLICITADO_PELA_GESTAO',
    'CANCELADA',
    'EXPIRADA'
);

-- CreateEnum
CREATE TYPE "StatusLogEmail" AS ENUM (
    'PENDENTE',
    'ENVIADO',
    'FALHOU',
    'IGNORADO'
);

-- CreateTable
CREATE TABLE "Proposta" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "quoteId" TEXT,
    "opportunityId" TEXT,
    "clientId" TEXT,
    "criadaPorId" TEXT,
    "enviadaPorId" TEXT,
    "status" "StatusProposta" NOT NULL DEFAULT 'RASCUNHO',
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "descricaoServico" TEXT,
    "origem" TEXT,
    "destino" TEXT,
    "valor" DECIMAL(65,30),
    "condicoesPagamento" TEXT,
    "condicoesComerciais" TEXT,
    "observacoes" TEXT,
    "validadeDias" INTEGER,
    "validaAte" TIMESTAMP(3),
    "versao" INTEGER NOT NULL DEFAULT 1,
    "enviadaEm" TIMESTAMP(3),
    "aprovadaPeloClienteEm" TIMESTAMP(3),
    "recusadaPeloClienteEm" TIMESTAMP(3),
    "ajusteSolicitadoPeloClienteEm" TIMESTAMP(3),
    "enviadaParaGestaoEm" TIMESTAMP(3),
    "aprovadaPelaGestaoEm" TIMESTAMP(3),
    "recusadaPelaGestaoEm" TIMESTAMP(3),
    "ajusteSolicitadoPelaGestaoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proposta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogEmail" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT,
    "propostaId" TEXT,
    "notificationId" TEXT,
    "userId" TEXT,
    "emailDestino" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "resumo" TEXT,
    "template" TEXT,
    "status" "StatusLogEmail" NOT NULL DEFAULT 'PENDENTE',
    "provedor" TEXT,
    "idMensagemProvedor" TEXT,
    "mensagemErro" TEXT,
    "enviadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Proposta_ticketId_idx" ON "Proposta"("ticketId");

-- CreateIndex
CREATE INDEX "Proposta_quoteId_idx" ON "Proposta"("quoteId");

-- CreateIndex
CREATE INDEX "Proposta_opportunityId_idx" ON "Proposta"("opportunityId");

-- CreateIndex
CREATE INDEX "Proposta_clientId_idx" ON "Proposta"("clientId");

-- CreateIndex
CREATE INDEX "Proposta_status_idx" ON "Proposta"("status");

-- CreateIndex
CREATE INDEX "Proposta_createdAt_idx" ON "Proposta"("createdAt");

-- CreateIndex
CREATE INDEX "Proposta_ticketId_versao_idx" ON "Proposta"("ticketId", "versao");

-- CreateIndex
CREATE INDEX "LogEmail_ticketId_idx" ON "LogEmail"("ticketId");

-- CreateIndex
CREATE INDEX "LogEmail_propostaId_idx" ON "LogEmail"("propostaId");

-- CreateIndex
CREATE INDEX "LogEmail_notificationId_idx" ON "LogEmail"("notificationId");

-- CreateIndex
CREATE INDEX "LogEmail_userId_idx" ON "LogEmail"("userId");

-- CreateIndex
CREATE INDEX "LogEmail_status_idx" ON "LogEmail"("status");

-- CreateIndex
CREATE INDEX "LogEmail_createdAt_idx" ON "LogEmail"("createdAt");

-- AddForeignKey
ALTER TABLE "Proposta" ADD CONSTRAINT "Proposta_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposta" ADD CONSTRAINT "Proposta_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposta" ADD CONSTRAINT "Proposta_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposta" ADD CONSTRAINT "Proposta_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposta" ADD CONSTRAINT "Proposta_criadaPorId_fkey" FOREIGN KEY ("criadaPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposta" ADD CONSTRAINT "Proposta_enviadaPorId_fkey" FOREIGN KEY ("enviadaPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogEmail" ADD CONSTRAINT "LogEmail_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogEmail" ADD CONSTRAINT "LogEmail_propostaId_fkey" FOREIGN KEY ("propostaId") REFERENCES "Proposta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogEmail" ADD CONSTRAINT "LogEmail_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogEmail" ADD CONSTRAINT "LogEmail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
