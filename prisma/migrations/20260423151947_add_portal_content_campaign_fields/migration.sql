-- AlterTable
ALTER TABLE "PortalContent" ADD COLUMN     "campaignName" TEXT,
ADD COLUMN     "ctaLabel" TEXT,
ADD COLUMN     "ctaUrl" TEXT,
ADD COLUMN     "highlight" BOOLEAN NOT NULL DEFAULT false;
