-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'CONSULTORA';

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "prospectedById" TEXT,
ADD COLUMN     "prospectedByName" TEXT,
ADD COLUMN     "sourceLeadId" TEXT,
ADD COLUMN     "sourceProspectId" TEXT;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "convertedProspectId" TEXT,
ADD COLUMN     "prospectedById" TEXT,
ADD COLUMN     "prospectedByName" TEXT;

-- AlterTable
ALTER TABLE "Prospect" ADD COLUMN     "prospectedById" TEXT,
ADD COLUMN     "prospectedByName" TEXT,
ADD COLUMN     "sourceLeadId" TEXT;

-- CreateIndex
CREATE INDEX "Client_prospectedById_createdAt_idx" ON "Client"("prospectedById", "createdAt");

-- CreateIndex
CREATE INDEX "Client_sourceLeadId_idx" ON "Client"("sourceLeadId");

-- CreateIndex
CREATE INDEX "Client_sourceProspectId_idx" ON "Client"("sourceProspectId");

-- CreateIndex
CREATE INDEX "Lead_prospectedById_createdAt_idx" ON "Lead"("prospectedById", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_convertedProspectId_idx" ON "Lead"("convertedProspectId");

-- CreateIndex
CREATE INDEX "Prospect_prospectedById_createdAt_idx" ON "Prospect"("prospectedById", "createdAt");

-- CreateIndex
CREATE INDEX "Prospect_sourceLeadId_idx" ON "Prospect"("sourceLeadId");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_sourceLeadId_fkey" FOREIGN KEY ("sourceLeadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_sourceProspectId_fkey" FOREIGN KEY ("sourceProspectId") REFERENCES "Prospect"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_convertedProspectId_fkey" FOREIGN KEY ("convertedProspectId") REFERENCES "Prospect"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_sourceLeadId_fkey" FOREIGN KEY ("sourceLeadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
