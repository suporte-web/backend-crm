CREATE TABLE "MarketingOAuthSession" (
    "id" TEXT NOT NULL,
    "provider" "MarketingProvider" NOT NULL,
    "userId" TEXT NOT NULL,
    "stateHash" TEXT NOT NULL,
    "browserHash" TEXT,
    "codeVerifierEncrypted" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "accessTokenEncrypted" TEXT,
    "refreshTokenEncrypted" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketingOAuthSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MarketingOAuthSession_stateHash_key" ON "MarketingOAuthSession"("stateHash");
CREATE INDEX "MarketingOAuthSession_provider_userId_idx" ON "MarketingOAuthSession"("provider", "userId");
CREATE INDEX "MarketingOAuthSession_expiresAt_idx" ON "MarketingOAuthSession"("expiresAt");
