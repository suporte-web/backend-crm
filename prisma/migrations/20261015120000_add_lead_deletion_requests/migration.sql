-- CreateEnum
CREATE TYPE "LeadDeletionRequestStatus" AS ENUM ('PENDENTE', 'APROVADA', 'RECUSADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "LeadDeletionRequest" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "requestedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "status" "LeadDeletionRequestStatus" NOT NULL DEFAULT 'PENDENTE',
    "reason" TEXT NOT NULL,
    "managementResponse" TEXT,
    "leadNameSnapshot" TEXT NOT NULL,
    "leadEmailSnapshot" TEXT,
    "leadSnapshot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "LeadDeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadDeletionRequest_leadId_status_idx" ON "LeadDeletionRequest"("leadId", "status");

-- CreateIndex
CREATE INDEX "LeadDeletionRequest_status_createdAt_idx" ON "LeadDeletionRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "LeadDeletionRequest_requestedById_createdAt_idx" ON "LeadDeletionRequest"("requestedById", "createdAt");

-- A fila não pode conter duas solicitações pendentes para o mesmo lead.
CREATE UNIQUE INDEX "LeadDeletionRequest_pending_lead_key"
ON "LeadDeletionRequest"("leadId")
WHERE "status" = 'PENDENTE' AND "leadId" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "LeadDeletionRequest" ADD CONSTRAINT "LeadDeletionRequest_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadDeletionRequest" ADD CONSTRAINT "LeadDeletionRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadDeletionRequest" ADD CONSTRAINT "LeadDeletionRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
