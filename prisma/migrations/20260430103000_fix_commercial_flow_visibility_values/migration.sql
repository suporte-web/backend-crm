ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "internalOnly" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Ticket_internalOnly_status_idx" ON "Ticket"("internalOnly", "status");

ALTER TABLE "Proposta" ADD COLUMN IF NOT EXISTS "motivoRecusaCliente" TEXT;

ALTER TYPE "AuditLogAction" ADD VALUE IF NOT EXISTS 'QUOTE_DELETED';
