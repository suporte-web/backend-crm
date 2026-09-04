/*
  Warnings:

  - A unique constraint covering the columns `[document]` on the table `Client` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Client_document_idx";

-- CreateTable
CREATE TABLE "SolicitacaoSite" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "departamento" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOVO',
    "origem" TEXT NOT NULL DEFAULT 'SITE_PIZZATTOLOG',
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT,
    "cargo" TEXT,
    "empresa" TEXT,
    "cnpj" TEXT,
    "solucao" TEXT,
    "cidade" TEXT,
    "categoriaCnh" TEXT,
    "possuiMopp" BOOLEAN,
    "possuiEar" BOOLEAN,
    "marcaVeiculo" TEXT,
    "anoVeiculo" INTEGER,
    "assunto" TEXT,
    "mensagem" TEXT,
    "aceitePrivacidade" BOOLEAN NOT NULL DEFAULT false,
    "aceiteComunicacoes" BOOLEAN NOT NULL DEFAULT false,
    "responsavelId" TEXT,
    "observacaoInterna" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolicitacaoSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnexoSolicitacaoSite" (
    "id" TEXT NOT NULL,
    "solicitacaoId" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "nomeArquivoOriginal" TEXT NOT NULL,
    "tipoArquivo" TEXT,
    "tamanho" INTEGER,
    "url" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnexoSolicitacaoSite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SolicitacaoSite_tipo_idx" ON "SolicitacaoSite"("tipo");

-- CreateIndex
CREATE INDEX "SolicitacaoSite_departamento_idx" ON "SolicitacaoSite"("departamento");

-- CreateIndex
CREATE INDEX "SolicitacaoSite_status_idx" ON "SolicitacaoSite"("status");

-- CreateIndex
CREATE INDEX "SolicitacaoSite_criadoEm_idx" ON "SolicitacaoSite"("criadoEm");

-- CreateIndex
CREATE INDEX "AnexoSolicitacaoSite_solicitacaoId_idx" ON "AnexoSolicitacaoSite"("solicitacaoId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_document_key" ON "Client"("document");

-- AddForeignKey
ALTER TABLE "AnexoSolicitacaoSite" ADD CONSTRAINT "AnexoSolicitacaoSite_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "SolicitacaoSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
