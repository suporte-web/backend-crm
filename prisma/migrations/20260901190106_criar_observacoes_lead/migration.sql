-- CreateTable
CREATE TABLE "LeadObservacao" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadObservacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadObservacao_leadId_createdAt_idx" ON "LeadObservacao"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "LeadObservacao_stage_createdAt_idx" ON "LeadObservacao"("stage", "createdAt");

-- CreateIndex
CREATE INDEX "LeadObservacao_createdById_idx" ON "LeadObservacao"("createdById");

-- AddForeignKey
ALTER TABLE "LeadObservacao" ADD CONSTRAINT "LeadObservacao_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadObservacao" ADD CONSTRAINT "LeadObservacao_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
