CREATE TABLE "LeadAnexo" (
 "id" TEXT NOT NULL, "leadId" TEXT NOT NULL, "nome" TEXT NOT NULL,
 "arquivo" TEXT NOT NULL, "tipo" TEXT NOT NULL, "tamanho" INTEGER NOT NULL,
 "comentario" TEXT, "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "usuarioId" TEXT, CONSTRAINT "LeadAnexo_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LeadAnexo_leadId_criadoEm_idx" ON "LeadAnexo"("leadId", "criadoEm");
ALTER TABLE "LeadAnexo" ADD CONSTRAINT "LeadAnexo_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadAnexo" ADD CONSTRAINT "LeadAnexo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
