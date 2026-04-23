-- CreateEnum
CREATE TYPE "LeadTimelineEventType" AS ENUM ('CREATED_MANUAL', 'IMPORTED_CSV', 'UPDATED', 'WHATSAPP_CREATED', 'WHATSAPP_INTERACTION', 'NOTE_ADDED');

-- CreateEnum
CREATE TYPE "LeadImportJobStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED');

-- CreateEnum
CREATE TYPE "LeadImportRowStatus" AS ENUM ('IMPORTED', 'SKIPPED', 'FAILED');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'new',
    "notes" TEXT,
    "normalizedEmail" TEXT,
    "normalizedPhone" TEXT,
    "channel" TEXT,
    "sourcePhone" TEXT,
    "externalMessageId" TEXT,
    "externalContactId" TEXT,
    "metadata" JSONB,
    "rawPayload" JSONB,
    "lastInteractionAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadTimelineEvent" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" "LeadTimelineEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadImportJob" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "sourceFileType" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "ignoredCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "status" "LeadImportJobStatus" NOT NULL DEFAULT 'PROCESSING',
    "summary" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "LeadImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadImportRowResult" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "status" "LeadImportRowStatus" NOT NULL,
    "reason" TEXT,
    "rawData" JSONB,
    "leadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadImportRowResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_normalizedEmail_idx" ON "Lead"("normalizedEmail");

-- CreateIndex
CREATE INDEX "Lead_normalizedPhone_idx" ON "Lead"("normalizedPhone");

-- CreateIndex
CREATE INDEX "Lead_source_createdAt_idx" ON "Lead"("source", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");

-- CreateIndex
CREATE INDEX "LeadTimelineEvent_leadId_createdAt_idx" ON "LeadTimelineEvent"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "LeadTimelineEvent_type_createdAt_idx" ON "LeadTimelineEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "LeadImportJob_createdAt_idx" ON "LeadImportJob"("createdAt");

-- CreateIndex
CREATE INDEX "LeadImportJob_status_createdAt_idx" ON "LeadImportJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "LeadImportRowResult_jobId_rowNumber_idx" ON "LeadImportRowResult"("jobId", "rowNumber");

-- CreateIndex
CREATE INDEX "LeadImportRowResult_leadId_idx" ON "LeadImportRowResult"("leadId");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadTimelineEvent" ADD CONSTRAINT "LeadTimelineEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadTimelineEvent" ADD CONSTRAINT "LeadTimelineEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadImportJob" ADD CONSTRAINT "LeadImportJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadImportRowResult" ADD CONSTRAINT "LeadImportRowResult_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "LeadImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadImportRowResult" ADD CONSTRAINT "LeadImportRowResult_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
