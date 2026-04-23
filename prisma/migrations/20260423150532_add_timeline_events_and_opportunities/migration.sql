-- CreateEnum
CREATE TYPE "TimelineEventType" AS ENUM ('LEAD_CREATED', 'LEAD_UPDATED', 'OPPORTUNITY_CREATED', 'STAGE_CHANGED', 'NOTE_ADDED', 'OPPORTUNITY_WON', 'OPPORTUNITY_LOST');

-- CreateEnum
CREATE TYPE "OpportunityStage" AS ENUM ('NOVO', 'QUALIFICADO', 'PROPOSTA', 'NEGOCIACAO', 'GANHO', 'PERDIDO');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('OPEN', 'WON', 'LOST');

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "value" DECIMAL(65,30),
    "stage" "OpportunityStage" NOT NULL DEFAULT 'NOVO',
    "status" "OpportunityStatus" NOT NULL DEFAULT 'OPEN',
    "expectedCloseDate" TIMESTAMP(3),
    "lostReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineEvent" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" "TimelineEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Opportunity_clientId_stage_idx" ON "Opportunity"("clientId", "stage");

-- CreateIndex
CREATE INDEX "Opportunity_status_createdAt_idx" ON "Opportunity"("status", "createdAt");

-- CreateIndex
CREATE INDEX "TimelineEvent_clientId_createdAt_idx" ON "TimelineEvent"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "TimelineEvent_type_createdAt_idx" ON "TimelineEvent"("type", "createdAt");

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
