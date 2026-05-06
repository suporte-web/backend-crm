-- AlterTable
ALTER TABLE "Quote" ADD COLUMN "code" TEXT;

-- AlterTable
ALTER TABLE "Proposta" ADD COLUMN "code" TEXT;

-- Backfill Quote code
WITH quote_codes AS (
    SELECT "id", 'COT-' || LPAD(ROW_NUMBER() OVER (ORDER BY "createdAt")::text, 6, '0') AS generated_code
    FROM "Quote"
)
UPDATE "Quote"
SET "code" = quote_codes.generated_code
FROM quote_codes
WHERE "Quote"."id" = quote_codes."id";

-- Backfill Proposta code
WITH proposta_codes AS (
    SELECT "id", 'PROP-' || LPAD(ROW_NUMBER() OVER (ORDER BY "createdAt")::text, 6, '0') AS generated_code
    FROM "Proposta"
)
UPDATE "Proposta"
SET "code" = proposta_codes.generated_code
FROM proposta_codes
WHERE "Proposta"."id" = proposta_codes."id";

-- Set constraints
ALTER TABLE "Quote" ALTER COLUMN "code" SET NOT NULL;
ALTER TABLE "Proposta" ALTER COLUMN "code" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Quote_code_key" ON "Quote"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Proposta_code_key" ON "Proposta"("code");
