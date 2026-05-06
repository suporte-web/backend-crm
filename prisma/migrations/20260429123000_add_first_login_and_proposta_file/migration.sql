-- AlterTable
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Proposta" ADD COLUMN "arquivoNome" TEXT;
ALTER TABLE "Proposta" ADD COLUMN "arquivoUrl" TEXT;
ALTER TABLE "Proposta" ADD COLUMN "arquivoMimeType" TEXT;
ALTER TABLE "Proposta" ADD COLUMN "arquivoTamanho" INTEGER;
