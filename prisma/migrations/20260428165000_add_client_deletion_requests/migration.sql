CREATE TYPE "ClientDeletionRequestStatus" AS ENUM ('PENDENTE', 'APROVADA', 'RECUSADA', 'CANCELADA');

CREATE TABLE "ClientDeletionRequest" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "requestedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "status" "ClientDeletionRequestStatus" NOT NULL DEFAULT 'PENDENTE',
    "reason" TEXT,
    "managementResponse" TEXT,
    "clientNameSnapshot" TEXT,
    "clientEmailSnapshot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "ClientDeletionRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClientDeletionRequest_clientId_createdAt_idx" ON "ClientDeletionRequest"("clientId", "createdAt");
CREATE INDEX "ClientDeletionRequest_status_createdAt_idx" ON "ClientDeletionRequest"("status", "createdAt");
CREATE INDEX "ClientDeletionRequest_requestedById_createdAt_idx" ON "ClientDeletionRequest"("requestedById", "createdAt");
CREATE INDEX "ClientDeletionRequest_approvedById_createdAt_idx" ON "ClientDeletionRequest"("approvedById", "createdAt");

ALTER TABLE "ClientDeletionRequest" ADD CONSTRAINT "ClientDeletionRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClientDeletionRequest" ADD CONSTRAINT "ClientDeletionRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientDeletionRequest" ADD CONSTRAINT "ClientDeletionRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
