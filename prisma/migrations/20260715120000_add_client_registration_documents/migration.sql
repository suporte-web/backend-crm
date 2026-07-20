-- AlterTable
ALTER TABLE "Client" ADD COLUMN "legalName" TEXT;
ALTER TABLE "Client" ADD COLUMN "tradeName" TEXT;
ALTER TABLE "Client" ADD COLUMN "cnae" TEXT;
ALTER TABLE "Client" ADD COLUMN "stateRegistration" TEXT;
ALTER TABLE "Client" ADD COLUMN "businessActivity" TEXT;
ALTER TABLE "Client" ADD COLUMN "taxRegime" TEXT;
ALTER TABLE "Client" ADD COLUMN "address" TEXT;
ALTER TABLE "Client" ADD COLUMN "bankDetails" TEXT;
ALTER TABLE "Client" ADD COLUMN "modality" TEXT;
ALTER TABLE "Client" ADD COLUMN "registrationDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ClientDocument" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientDocument_clientId_idx" ON "ClientDocument"("clientId");

-- CreateIndex
CREATE INDEX "ClientDocument_uploadedById_idx" ON "ClientDocument"("uploadedById");

-- AddForeignKey
ALTER TABLE "ClientDocument" ADD CONSTRAINT "ClientDocument_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientDocument" ADD CONSTRAINT "ClientDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
