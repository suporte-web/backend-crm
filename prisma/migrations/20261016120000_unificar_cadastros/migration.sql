BEGIN;

CREATE TYPE "RegistrationType" AS ENUM ('CLIENT', 'LEAD');
ALTER TABLE "Client" ADD COLUMN "registrationType" "RegistrationType" NOT NULL DEFAULT 'CLIENT';
ALTER TABLE "Lead" ADD COLUMN "registrationId" TEXT;

-- Usa o vínculo explícito da conversão, quando ele ainda aponta para um cliente válido.
UPDATE "Lead" l SET "registrationId" = c.id
FROM "Client" c
WHERE l.metadata->>'clientId' = c.id
  AND (c."sourceLeadId" = l.id OR c."sourceLeadId" IS NULL);

-- Sem vínculo explícito, apenas uma origem inequívoca pode ser associada automaticamente.
UPDATE "Lead" l SET "registrationId" = origem.id
FROM (SELECT "sourceLeadId", min(id) AS id FROM "Client"
      WHERE "sourceLeadId" IS NOT NULL GROUP BY "sourceLeadId" HAVING count(*) = 1) origem
WHERE l.id = origem."sourceLeadId" AND l."registrationId" IS NULL;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "Lead" l JOIN "Client" c ON c."sourceLeadId" = l.id
             WHERE l."registrationId" IS NULL GROUP BY l.id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Há leads com mais de um cadastro de origem. Revise os vínculos antes de migrar.';
  END IF;
  IF EXISTS (SELECT 1 FROM "Lead" WHERE "registrationId" IS NOT NULL
             GROUP BY "registrationId" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Há múltiplos leads apontando para o mesmo cadastro. Revise os vínculos antes de migrar.';
  END IF;
END $$;

-- A criação do cadastro compartilhado não representa uma conversão comercial.
CREATE TEMP TABLE cadastros_leads ON COMMIT DROP AS
SELECT id AS "leadId", gen_random_uuid()::text AS "cadastroId" FROM "Lead" WHERE "registrationId" IS NULL;

INSERT INTO "Client" (id, "registrationType", "sourceLeadId", "companyName", phone, notes,
                      "internalOwnerId", "prospectedById", "prospectedByName", status, "createdAt", "updatedAt")
SELECT m."cadastroId", CASE WHEN l."convertidoParaCliente" THEN 'CLIENT'::"RegistrationType" ELSE 'LEAD'::"RegistrationType" END,
       l.id, COALESCE(NULLIF(l.company, ''), l.name), l.phone, l.notes,
       l."createdById", l."prospectedById", l."prospectedByName", 'PENDENTE', l."createdAt", l."updatedAt"
FROM "Lead" l JOIN cadastros_leads m ON m."leadId" = l.id;

INSERT INTO "ClientContact" (id, "clientId", name, email, phone, "isPrimary", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, m."cadastroId", l.name, l.email, l.phone, true, l."createdAt", l."updatedAt"
FROM "Lead" l JOIN cadastros_leads m ON m."leadId" = l.id;

UPDATE "Lead" l SET "registrationId" = m."cadastroId" FROM cadastros_leads m WHERE m."leadId" = l.id;
CREATE UNIQUE INDEX "Lead_registrationId_key" ON "Lead"("registrationId");
CREATE INDEX "Client_registrationType_createdAt_idx" ON "Client"("registrationType", "createdAt");
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Client"(id) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
