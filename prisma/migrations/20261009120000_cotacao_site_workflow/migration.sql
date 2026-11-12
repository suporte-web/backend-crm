-- Classificação própria para a captação de cotações (não altera o funil).
CREATE TYPE "CotacaoSiteEtapa" AS ENUM ('LEAD', 'PROSPECT', 'CLIENTE');
ALTER TABLE "SolicitacaoSite" ADD COLUMN "etapaCotacao" "CotacaoSiteEtapa",
  ADD COLUMN "leadId" TEXT, ADD COLUMN "prospectId" TEXT, ADD COLUMN "clientId" TEXT;

-- Associar somente Leads cuja origem referencia explicitamente a solicitação.
WITH candidatos AS (
  SELECT s.id, l.id AS "leadId", ROW_NUMBER() OVER (PARTITION BY s.id ORDER BY l."createdAt", l.id) AS pos
  FROM "SolicitacaoSite" s JOIN "Lead" l ON l.metadata->>'solicitacaoSiteId' = s.id
  WHERE s.tipo = 'COTACAO'
)
UPDATE "SolicitacaoSite" s SET "leadId" = c."leadId"
FROM candidatos c WHERE s.id = c.id AND c.pos = 1;

-- Capturas antigas sem Lead ganham apenas o vínculo faltante, mantendo os dados.
INSERT INTO "Lead" (id, name, email, phone, company, source, status, channel, metadata,
  "normalizedEmail", "normalizedPhone", "createdAt", "updatedAt", "convertidoParaCliente")
SELECT gen_random_uuid()::text, s.nome, s.email, s.telefone, s.empresa, 'site', 'site_lead', 'site',
  jsonb_build_object('solicitacaoSiteId', s.id, 'origem', 'SITE_PIZZATTOLOG', 'tipoSolicitacao', 'COTACAO'),
  lower(trim(s.email)), NULLIF(regexp_replace(COALESCE(s.telefone, ''), '[^0-9]', '', 'g'), ''),
  s."criadoEm", s."atualizadoEm", false
FROM "SolicitacaoSite" s WHERE s.tipo = 'COTACAO' AND s."leadId" IS NULL;
UPDATE "SolicitacaoSite" s SET "leadId" = l.id
FROM "Lead" l WHERE s.tipo = 'COTACAO' AND s."leadId" IS NULL AND l.metadata->>'solicitacaoSiteId' = s.id;

-- Preservar conversões antigas quando seu destino ainda existe.
UPDATE "SolicitacaoSite" s SET "prospectId" = p.id
FROM "Lead" l JOIN "Prospect" p ON p.id = l.metadata->>'prospectId' WHERE s."leadId" = l.id;
UPDATE "SolicitacaoSite" s SET "clientId" = c.id
FROM "Lead" l JOIN "Client" c ON c.id = l.metadata->>'clientId' WHERE s."leadId" = l.id;
UPDATE "SolicitacaoSite" s SET "etapaCotacao" = CASE
  WHEN s."clientId" IS NOT NULL THEN 'CLIENTE'::"CotacaoSiteEtapa"
  WHEN s."prospectId" IS NOT NULL THEN 'PROSPECT'::"CotacaoSiteEtapa"
  ELSE 'LEAD'::"CotacaoSiteEtapa" END,
  departamento = CASE WHEN s."prospectId" IS NULL AND s."clientId" IS NULL THEN 'MARKETING' ELSE 'COMERCIAL' END
WHERE s.tipo = 'COTACAO';
-- Recuperar responsável válido sem fabricar autoria para conversões anteriores.
UPDATE "SolicitacaoSite" s SET "responsavelId" = u.id
FROM "Lead" l JOIN "User" u ON u.id = l."updatedById"
WHERE s."leadId" = l.id AND s."responsavelId" IS NULL AND s."etapaCotacao" IN ('PROSPECT','CLIENTE')
  AND (u.role = 'COMERCIAL' OR 'COMERCIAL' = ANY(u.roles));
-- Valores antigos órfãos não podem se tornar uma FK inválida.
UPDATE "SolicitacaoSite" s SET "responsavelId" = NULL WHERE s."responsavelId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = s."responsavelId");

CREATE UNIQUE INDEX "SolicitacaoSite_leadId_key" ON "SolicitacaoSite"("leadId");
CREATE INDEX "SolicitacaoSite_etapaCotacao_responsavelId_idx" ON "SolicitacaoSite"("etapaCotacao", "responsavelId");
CREATE INDEX "SolicitacaoSite_prospectId_idx" ON "SolicitacaoSite"("prospectId");
CREATE INDEX "SolicitacaoSite_clientId_idx" ON "SolicitacaoSite"("clientId");
ALTER TABLE "SolicitacaoSite" ADD CONSTRAINT "SolicitacaoSite_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SolicitacaoSite" ADD CONSTRAINT "SolicitacaoSite_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SolicitacaoSite" ADD CONSTRAINT "SolicitacaoSite_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SolicitacaoSite" ADD CONSTRAINT "SolicitacaoSite_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "User"(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Completar histórico de captura apenas quando não existe evento no Lead.
INSERT INTO "LeadTimelineEvent" (id, "leadId", type, title, description, metadata, "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, s."leadId", 'CREATED_MANUAL', 'Lead recebido do site',
  'Captura anterior vinculada ao fluxo de qualificação do site.', jsonb_build_object('solicitacaoSiteId', s.id),
  s."criadoEm", s."criadoEm"
FROM "SolicitacaoSite" s WHERE s.tipo = 'COTACAO' AND NOT EXISTS (
  SELECT 1 FROM "LeadTimelineEvent" e WHERE e."leadId" = s."leadId");

INSERT INTO "RoleScreenPermission" (id, role, "screenKey", "screenLabel", "isEnabled", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, role, 'prospects', 'Prospects', role::text IN ('ADMIN','GESTAO','MARKETING','COMERCIAL'), NOW(), NOW()
FROM unnest(enum_range(NULL::"UserRole")) AS role
ON CONFLICT (role, "screenKey") DO NOTHING;
