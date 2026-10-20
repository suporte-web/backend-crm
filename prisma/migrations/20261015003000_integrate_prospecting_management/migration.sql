-- Esta migration pode encontrar estruturas da implementação anterior.
-- Preserva colunas/dados existentes e permite retomar após a falha 42701.
-- Não marca a migration como aplicada: o histórico deve ser reconciliado pelo Prisma.
-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'CONSULTORA';

-- Estrutura e backfill são atômicos; o enum fica fora da transação.
BEGIN;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "prospectedById" TEXT,
ADD COLUMN IF NOT EXISTS "prospectedByName" TEXT,
ADD COLUMN IF NOT EXISTS "sourceLeadId" TEXT,
ADD COLUMN IF NOT EXISTS "sourceProspectId" TEXT;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "convertedProspectId" TEXT,
ADD COLUMN IF NOT EXISTS "prospectedById" TEXT,
ADD COLUMN IF NOT EXISTS "prospectedByName" TEXT;

-- AlterTable
ALTER TABLE "Prospect" ADD COLUMN IF NOT EXISTS "prospectedById" TEXT,
ADD COLUMN IF NOT EXISTS "prospectedByName" TEXT,
ADD COLUMN IF NOT EXISTS "sourceLeadId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Client_prospectedById_createdAt_idx" ON "Client"("prospectedById", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Client_sourceLeadId_idx" ON "Client"("sourceLeadId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Client_sourceProspectId_idx" ON "Client"("sourceProspectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lead_prospectedById_createdAt_idx" ON "Lead"("prospectedById", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lead_convertedProspectId_idx" ON "Lead"("convertedProspectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Prospect_prospectedById_createdAt_idx" ON "Prospect"("prospectedById", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Prospect_sourceLeadId_idx" ON "Prospect"("sourceLeadId");

-- O schema atual permite várias conversões ligadas à mesma origem.
-- Substitui somente os índices únicos conhecidos do backup; os índices
-- não únicos acima mantêm as consultas indexadas. Nenhum registro é removido.
DROP INDEX IF EXISTS "Client_sourceLeadId_key";
DROP INDEX IF EXISTS "Client_sourceProspectId_key";
DROP INDEX IF EXISTS "Prospect_sourceLeadId_key";

-- AddForeignKey
DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = '"Client"'::regclass AND conname = 'Client_sourceLeadId_fkey'
  ) THEN
    ALTER TABLE "Client" ADD CONSTRAINT "Client_sourceLeadId_fkey" FOREIGN KEY ("sourceLeadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END;
$migration$;

-- AddForeignKey
DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = '"Client"'::regclass AND conname = 'Client_sourceProspectId_fkey'
  ) THEN
    ALTER TABLE "Client" ADD CONSTRAINT "Client_sourceProspectId_fkey" FOREIGN KEY ("sourceProspectId") REFERENCES "Prospect"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END;
$migration$;

-- AddForeignKey
DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = '"Lead"'::regclass AND conname = 'Lead_convertedProspectId_fkey'
  ) THEN
    ALTER TABLE "Lead" ADD CONSTRAINT "Lead_convertedProspectId_fkey" FOREIGN KEY ("convertedProspectId") REFERENCES "Prospect"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END;
$migration$;

-- AddForeignKey
DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = '"Prospect"'::regclass AND conname = 'Prospect_sourceLeadId_fkey'
  ) THEN
    ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_sourceLeadId_fkey" FOREIGN KEY ("sourceLeadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END;
$migration$;

-- Recupera apenas vínculos explícitos já registrados; não compara documentos/contatos.
UPDATE "Lead" l SET "convertedProspectId" = p.id
FROM "Prospect" p WHERE l.metadata->>'prospectId' = p.id
  AND l."convertedProspectId" IS NULL;

-- Várias origens podem reutilizar um prospect. A origem canônica é a primeira.
WITH origins AS (
  SELECT DISTINCT ON (l."convertedProspectId") l."convertedProspectId" AS target, l.id
  FROM "Lead" l WHERE l."convertedProspectId" IS NOT NULL
  ORDER BY l."convertedProspectId", l."createdAt", l.id
)
UPDATE "Prospect" p SET "sourceLeadId" = o.id FROM origins o
WHERE p.id = o.target AND p."sourceLeadId" IS NULL;

-- Prospect criado diretamente a partir de uma entrada vinculada ao lead.
UPDATE "Prospect" p SET "sourceLeadId" = t."leadId"
FROM "Ticket" t JOIN "Lead" l ON l.id = t."leadId"
WHERE p."createdFromTicketId" = t.id AND p."sourceLeadId" IS NULL;

-- Reconcilia o vínculo adicionado por entradas, sem trocar conversões já registradas.
WITH origins AS (
  SELECT DISTINCT ON (p."sourceLeadId") p."sourceLeadId" AS lead, p.id
  FROM "Prospect" p WHERE p."sourceLeadId" IS NOT NULL
  ORDER BY p."sourceLeadId", p."createdAt", p.id
)
UPDATE "Lead" l SET "convertedProspectId" = o.id FROM origins o
WHERE l.id = o.lead AND l."convertedProspectId" IS NULL;

WITH origins AS (
  SELECT DISTINCT ON (c.id) c.id AS target, l.id
  FROM "Lead" l JOIN "Client" c ON l.metadata->>'clientId' = c.id
  ORDER BY c.id, l."createdAt", l.id
)
UPDATE "Client" c SET "sourceLeadId" = o.id FROM origins o
WHERE c.id = o.target AND c."sourceLeadId" IS NULL;

UPDATE "Client" c SET "sourceProspectId" = l."convertedProspectId"
FROM "Lead" l WHERE c."sourceLeadId" = l.id
  AND c."sourceProspectId" IS NULL AND l."convertedProspectId" IS NOT NULL;

-- Autoria registrada em createdById; nunca usa o responsável comercial mutável.
-- Perfil atual é a evidência disponível para registros anteriores aos snapshots.
UPDATE "Lead" l SET "prospectedById" = u.id, "prospectedByName" = u.name
FROM "User" u WHERE l."createdById" = u.id AND l."prospectedById" IS NULL
  AND (u.role::text = 'CONSULTORA' OR 'CONSULTORA' = ANY(u.roles::text[]));

UPDATE "Prospect" p SET "prospectedById" = l."prospectedById", "prospectedByName" = l."prospectedByName"
FROM "Lead" l WHERE p."sourceLeadId" = l.id
  AND p."prospectedById" IS NULL AND l."prospectedById" IS NOT NULL;

UPDATE "Client" c SET "prospectedById" = l."prospectedById", "prospectedByName" = l."prospectedByName"
FROM "Lead" l WHERE c."sourceLeadId" = l.id
  AND c."prospectedById" IS NULL AND l."prospectedById" IS NOT NULL;

UPDATE "Client" c SET "prospectedById" = p."prospectedById", "prospectedByName" = p."prospectedByName"
FROM "Prospect" p WHERE c."sourceProspectId" = p.id
  AND c."prospectedById" IS NULL AND p."prospectedById" IS NOT NULL;

COMMIT;
