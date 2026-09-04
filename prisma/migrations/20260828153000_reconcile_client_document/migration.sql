-- Reconcilia alterações existentes na tabela ClientDocument
-- com o histórico oficial de migrations do Prisma.

ALTER TABLE "ClientDocument"
ADD COLUMN IF NOT EXISTS "category" TEXT;

ALTER TABLE "ClientDocument"
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "ClientDocument_clientId_createdAt_idx"
ON "ClientDocument"("clientId", "createdAt");