/*
  Warnings:

  - You are about to drop the column `userId` on the `Client` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Client" DROP CONSTRAINT "Client_userId_fkey";

-- DropIndex
DROP INDEX "Client_userId_key";

-- AlterTable
ALTER TABLE "Client" DROP COLUMN "userId";

-- CreateIndex
CREATE INDEX "Client_internalOwnerId_idx" ON "Client"("internalOwnerId");

-- CreateIndex
CREATE INDEX "Client_document_idx" ON "Client"("document");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_internalOwnerId_fkey" FOREIGN KEY ("internalOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
