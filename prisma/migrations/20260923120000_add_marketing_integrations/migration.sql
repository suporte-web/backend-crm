-- CreateEnum
CREATE TYPE "MarketingProvider" AS ENUM (
    'GOOGLE_ANALYTICS',
    'GOOGLE_ADS',
    'META',
    'LINKEDIN'
);

-- CreateEnum
CREATE TYPE "MarketingIntegrationStatus" AS ENUM (
    'NAO_CONFIGURADO',
    'CONECTANDO',
    'CONECTADO',
    'ERRO',
    'EXPIRADO'
);

-- CreateTable
CREATE TABLE "MarketingIntegration" (
    "id" TEXT NOT NULL,
    "provider" "MarketingProvider" NOT NULL,
    "status" "MarketingIntegrationStatus" NOT NULL DEFAULT 'NAO_CONFIGURADO',
    "accountId" TEXT,
    "accountName" TEXT,
    "accessTokenEncrypted" TEXT,
    "refreshTokenEncrypted" TEXT,
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketingIntegration_provider_key" ON "MarketingIntegration"("provider");
