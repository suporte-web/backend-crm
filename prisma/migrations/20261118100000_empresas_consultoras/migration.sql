CREATE TABLE "EmpresaConsultora" (
  "id" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "cnpj" TEXT,
  "ativa" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmpresaConsultora_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EmpresaConsultora_cnpj_key" ON "EmpresaConsultora"("cnpj");
ALTER TABLE "User" ADD COLUMN "empresaConsultoraId" TEXT;
ALTER TABLE "Client" ADD COLUMN "empresaConsultoraId" TEXT;
CREATE INDEX "User_empresaConsultoraId_idx" ON "User"("empresaConsultoraId");
CREATE INDEX "Client_empresaConsultoraId_createdAt_idx" ON "Client"("empresaConsultoraId", "createdAt");
ALTER TABLE "User" ADD CONSTRAINT "User_empresaConsultoraId_fkey" FOREIGN KEY ("empresaConsultoraId") REFERENCES "EmpresaConsultora"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Client" ADD CONSTRAINT "Client_empresaConsultoraId_fkey" FOREIGN KEY ("empresaConsultoraId") REFERENCES "EmpresaConsultora"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
