-- CreateEnum
CREATE TYPE "EntradaOrigem" AS ENUM ('SITE', 'PORTAL', 'MANUAL');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('BAIXA', 'NORMAL', 'ALTA', 'URGENTE');

-- CreateEnum
CREATE TYPE "ProspectStatusCadastral" AS ENUM ('PROSPECT', 'AGUARDANDO_CADASTRO', 'EM_VALIDACAO', 'ATIVO', 'REPROVADO', 'INATIVO');

-- CreateEnum
CREATE TYPE "ProspectPortalAccessStatus" AS ENUM ('SEM_ACESSO', 'CONVITE_ENVIADO', 'ATIVO', 'BLOQUEADO');

-- AlterEnum
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'CONVERTIDO_EM_PROSPECT';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'COTACAO_CRIADA';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'FINALIZADO';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'PERDIDO';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'TRANSFERIDO';

-- AlterEnum
ALTER TYPE "TicketType" ADD VALUE IF NOT EXISTS 'FORNECEDOR';
ALTER TYPE "TicketType" ADD VALUE IF NOT EXISTS 'AGREGADO';
ALTER TYPE "TicketType" ADD VALUE IF NOT EXISTS 'FINANCEIRO';
ALTER TYPE "TicketType" ADD VALUE IF NOT EXISTS 'FISCAL';
ALTER TYPE "TicketType" ADD VALUE IF NOT EXISTS 'JURIDICO';
ALTER TYPE "TicketType" ADD VALUE IF NOT EXISTS 'MARKETING';
ALTER TYPE "TicketType" ADD VALUE IF NOT EXISTS 'FROTA';

-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL,
    "nomeRazaoSocial" TEXT NOT NULL,
    "nomeContato" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "document" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "origem" "EntradaOrigem" NOT NULL DEFAULT 'SITE',
    "statusCadastral" "ProspectStatusCadastral" NOT NULL DEFAULT 'PROSPECT',
    "portalAccessStatus" "ProspectPortalAccessStatus" NOT NULL DEFAULT 'SEM_ACESSO',
    "createdFromTicketId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Quote"
    ALTER COLUMN "clientId" DROP NOT NULL,
    ADD COLUMN "prospectId" TEXT;

-- AlterTable
ALTER TABLE "Ticket"
    ADD COLUMN "protocolo" TEXT,
    ADD COLUMN "prospectId" TEXT,
    ADD COLUMN "origem" "EntradaOrigem",
    ADD COLUMN "prioridade" "TicketPriority" NOT NULL DEFAULT 'NORMAL',
    ADD COLUMN "nomeSolicitante" TEXT,
    ADD COLUMN "emailSolicitante" TEXT,
    ADD COLUMN "telefoneSolicitante" TEXT,
    ADD COLUMN "mensagem" TEXT,
    ADD COLUMN "formPayload" JSONB,
    ADD COLUMN "closedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Prospect_email_idx" ON "Prospect"("email");
CREATE INDEX "Prospect_telefone_idx" ON "Prospect"("telefone");
CREATE INDEX "Prospect_document_idx" ON "Prospect"("document");
CREATE INDEX "Prospect_statusCadastral_createdAt_idx" ON "Prospect"("statusCadastral", "createdAt");
CREATE INDEX "Prospect_origem_createdAt_idx" ON "Prospect"("origem", "createdAt");
CREATE INDEX "Quote_prospectId_idx" ON "Quote"("prospectId");
CREATE UNIQUE INDEX "Ticket_protocolo_key" ON "Ticket"("protocolo");
CREATE INDEX "Ticket_prospectId_idx" ON "Ticket"("prospectId");
CREATE INDEX "Ticket_origem_createdAt_idx" ON "Ticket"("origem", "createdAt");
CREATE INDEX "Ticket_protocolo_idx" ON "Ticket"("protocolo");

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_createdFromTicketId_fkey" FOREIGN KEY ("createdFromTicketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE SET NULL ON UPDATE CASCADE;
