-- CreateEnum
CREATE TYPE "StatusAtendimentoSac" AS ENUM ('NOVO', 'ATRIBUIDO', 'EM_ATENDIMENTO', 'CLASSIFICADO', 'AGUARDANDO_ACAO', 'EM_TRATATIVA', 'AGUARDANDO_AVALIACAO', 'CONCLUIDO', 'REABERTO');

-- CreateEnum
CREATE TYPE "TipoTarefaSac" AS ENUM ('TRIAGEM', 'ATENDIMENTO', 'CLASSIFICACAO', 'ACAO_CORRETIVA', 'AVALIACAO_SOLUCAO', 'REGISTRO_RNC', 'CONCLUSAO');

-- CreateEnum
CREATE TYPE "StatusTarefaSac" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'LIDER_ATENDIMENTO';
ALTER TYPE "UserRole" ADD VALUE 'ATENDIMENTO';

-- CreateTable
CREATE TABLE "AtendimentoSac" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "protocolo" TEXT,
    "ticketOrigemId" TEXT NOT NULL,
    "relatoOriginal" JSONB NOT NULL,
    "tipo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "empresa" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "status" "StatusAtendimentoSac" NOT NULL DEFAULT 'NOVO',
    "atendenteId" TEXT,
    "responsavelAcaoId" TEXT,
    "area" TEXT,
    "tipoReclamacao" TEXT,
    "documento" TEXT,
    "motivo" TEXT,
    "observacoesClassificacao" TEXT,
    "planoAcao" JSONB,
    "rnc" JSONB,
    "prazo" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "concluidoEm" TIMESTAMP(3),
    "concluidoPorId" TEXT,

    CONSTRAINT "AtendimentoSac_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtendimentoSacHistorico" (
    "id" TEXT NOT NULL,
    "atendimentoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "usuarioId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statusAnterior" "StatusAtendimentoSac",
    "statusNovo" "StatusAtendimentoSac",
    "tarefaId" TEXT,
    "dados" JSONB,

    CONSTRAINT "AtendimentoSacHistorico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtendimentoSacTarefa" (
    "id" TEXT NOT NULL,
    "atendimentoId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" "TipoTarefaSac" NOT NULL,
    "responsavelId" TEXT,
    "perfilResponsavel" "UserRole",
    "criadorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prazo" TIMESTAMP(3),
    "iniciadoEm" TIMESTAMP(3),
    "concluidoEm" TIMESTAMP(3),
    "status" "StatusTarefaSac" NOT NULL DEFAULT 'PENDENTE',
    "observacao" TEXT,

    CONSTRAINT "AtendimentoSacTarefa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtendimentoSacAnexo" (
    "id" TEXT NOT NULL,
    "atendimentoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "arquivo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "comentario" TEXT,
    "etapa" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT,
    "tarefaId" TEXT,

    CONSTRAINT "AtendimentoSacAnexo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AtendimentoSac_numero_key" ON "AtendimentoSac"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "AtendimentoSac_protocolo_key" ON "AtendimentoSac"("protocolo");

-- CreateIndex
CREATE UNIQUE INDEX "AtendimentoSac_ticketOrigemId_key" ON "AtendimentoSac"("ticketOrigemId");

-- CreateIndex
CREATE INDEX "AtendimentoSac_status_criadoEm_idx" ON "AtendimentoSac"("status", "criadoEm");

-- CreateIndex
CREATE INDEX "AtendimentoSac_atendenteId_status_idx" ON "AtendimentoSac"("atendenteId", "status");

-- CreateIndex
CREATE INDEX "AtendimentoSac_responsavelAcaoId_status_idx" ON "AtendimentoSac"("responsavelAcaoId", "status");

-- CreateIndex
CREATE INDEX "AtendimentoSac_area_idx" ON "AtendimentoSac"("area");

-- CreateIndex
CREATE INDEX "AtendimentoSacHistorico_atendimentoId_criadoEm_idx" ON "AtendimentoSacHistorico"("atendimentoId", "criadoEm");

-- CreateIndex
CREATE INDEX "AtendimentoSacTarefa_responsavelId_status_idx" ON "AtendimentoSacTarefa"("responsavelId", "status");

-- CreateIndex
CREATE INDEX "AtendimentoSacTarefa_atendimentoId_tipo_idx" ON "AtendimentoSacTarefa"("atendimentoId", "tipo");

-- CreateIndex
CREATE INDEX "AtendimentoSacAnexo_atendimentoId_etapa_idx" ON "AtendimentoSacAnexo"("atendimentoId", "etapa");

-- AddForeignKey
ALTER TABLE "AtendimentoSac" ADD CONSTRAINT "AtendimentoSac_ticketOrigemId_fkey" FOREIGN KEY ("ticketOrigemId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtendimentoSac" ADD CONSTRAINT "AtendimentoSac_atendenteId_fkey" FOREIGN KEY ("atendenteId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtendimentoSac" ADD CONSTRAINT "AtendimentoSac_responsavelAcaoId_fkey" FOREIGN KEY ("responsavelAcaoId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtendimentoSac" ADD CONSTRAINT "AtendimentoSac_concluidoPorId_fkey" FOREIGN KEY ("concluidoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtendimentoSacHistorico" ADD CONSTRAINT "AtendimentoSacHistorico_atendimentoId_fkey" FOREIGN KEY ("atendimentoId") REFERENCES "AtendimentoSac"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtendimentoSacHistorico" ADD CONSTRAINT "AtendimentoSacHistorico_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtendimentoSacHistorico" ADD CONSTRAINT "AtendimentoSacHistorico_tarefaId_fkey" FOREIGN KEY ("tarefaId") REFERENCES "AtendimentoSacTarefa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtendimentoSacTarefa" ADD CONSTRAINT "AtendimentoSacTarefa_atendimentoId_fkey" FOREIGN KEY ("atendimentoId") REFERENCES "AtendimentoSac"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtendimentoSacTarefa" ADD CONSTRAINT "AtendimentoSacTarefa_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtendimentoSacTarefa" ADD CONSTRAINT "AtendimentoSacTarefa_criadorId_fkey" FOREIGN KEY ("criadorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtendimentoSacAnexo" ADD CONSTRAINT "AtendimentoSacAnexo_atendimentoId_fkey" FOREIGN KEY ("atendimentoId") REFERENCES "AtendimentoSac"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtendimentoSacAnexo" ADD CONSTRAINT "AtendimentoSacAnexo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtendimentoSacAnexo" ADD CONSTRAINT "AtendimentoSacAnexo_tarefaId_fkey" FOREIGN KEY ("tarefaId") REFERENCES "AtendimentoSacTarefa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
