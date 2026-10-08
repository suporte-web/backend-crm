-- Copia o nome para a visita antes de remover a dependência do cadastro.
BEGIN;
ALTER TABLE "VisitaCliente" ADD COLUMN "clienteNome" TEXT;
UPDATE "VisitaCliente" v SET "clienteNome" = COALESCE(NULLIF(BTRIM(c."companyName"), ''), NULLIF(BTRIM(c."tradeName"), ''), NULLIF(BTRIM(c."legalName"), ''), 'Cliente')
FROM "Client" c WHERE c."id" = v."clienteId";
UPDATE "VisitaCliente" SET "clienteNome" = 'Cliente' WHERE "clienteNome" IS NULL;
ALTER TABLE "VisitaCliente" ALTER COLUMN "clienteNome" SET NOT NULL;
ALTER TABLE "VisitaCliente" DROP CONSTRAINT "VisitaCliente_clienteId_fkey";
ALTER TABLE "VisitaCliente" ALTER COLUMN "clienteId" DROP NOT NULL;
DROP INDEX "VisitaCliente_clienteId_dataPrevista_idx";
CREATE INDEX "VisitaCliente_clienteNome_dataPrevista_idx" ON "VisitaCliente"("clienteNome", "dataPrevista");
COMMIT;
