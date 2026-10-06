CREATE TABLE "MarketingManualReport" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "importedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketingManualReport_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MarketingManualReport_createdAt_idx" ON "MarketingManualReport"("createdAt");
