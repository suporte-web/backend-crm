ALTER TABLE "Client" ADD COLUMN "responsavelId" TEXT;
CREATE INDEX "Client_responsavelId_createdAt_idx" ON "Client"("responsavelId", "createdAt");
ALTER TABLE "Client" ADD CONSTRAINT "Client_responsavelId_fkey"
  FOREIGN KEY ("responsavelId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
