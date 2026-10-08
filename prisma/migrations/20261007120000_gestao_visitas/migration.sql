-- CreateEnum
CREATE TYPE "StatusVisita" AS ENUM ('AGENDADA', 'AGUARDANDO_REALIZACAO', 'REAGENDAMENTO', 'AGUARDANDO_VALIDACAO', 'POS_VISITA', 'ATENDIMENTO_SAC', 'CONCLUIDA');

-- CreateEnum
CREATE TYPE "EtapaVisita" AS ENUM ('VISITA', 'REALIZACAO', 'VALIDACAO', 'POS_VISITA');

-- CreateEnum
CREATE TYPE "ClassificacaoVisita" AS ENUM ('EXCELENTE', 'BOA', 'REGULAR', 'RUIM');

-- AlterEnum
ALTER TYPE "EntradaOrigem" ADD VALUE 'VISITA';

-- CreateTable
CREATE TABLE "VisitaCliente" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "protocolo" TEXT,
    "clienteId" TEXT NOT NULL,
    "cnpj" TEXT,
    "localVisita" TEXT NOT NULL,
    "dataPrevista" TIMESTAMP(3) NOT NULL,
    "dataRealizada" TIMESTAMP(3),
    "responsavelId" TEXT NOT NULL,
    "criadoPorId" TEXT NOT NULL,
    "tipoVisita" TEXT NOT NULL,
    "observacoes" TEXT,
    "status" "StatusVisita" NOT NULL DEFAULT 'AGENDADA',
    "relato" TEXT,
    "insights" TEXT,
    "pontosPositivos" TEXT,
    "pontosAtencao" TEXT,
    "pessoaAtendeu" TEXT,
    "contatoPessoaAtendeu" TEXT,
    "emailPessoaAtendeu" TEXT,
    "teveCusto" BOOLEAN,
    "custo" DECIMAL(12,2),
    "novaDataAceita" BOOLEAN,
    "atingiuObjetivo" BOOLEAN,
    "sentimentoCliente" TEXT,
    "possuiMelhoria" BOOLEAN,
    "melhoriaIdentificada" TEXT,
    "classificacao" "ClassificacaoVisita",
    "avaliacaoRegistradaEm" TIMESTAMP(3),
    "sacId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "concluidoEm" TIMESTAMP(3),

    CONSTRAINT "VisitaCliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitaParticipante" (
    "id" TEXT NOT NULL,
    "visitaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "usuarioId" TEXT,
    "comunicacaoStatus" TEXT NOT NULL DEFAULT 'PENDENTE',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitaParticipante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitaRealizacao" (
    "id" TEXT NOT NULL,
    "visitaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "dataRealizada" TIMESTAMP(3) NOT NULL,
    "dados" JSONB NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitaRealizacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitaValidacao" (
    "id" TEXT NOT NULL,
    "visitaId" TEXT NOT NULL,
    "gestorId" TEXT NOT NULL,
    "decisao" TEXT NOT NULL,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitaValidacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitaReagendamento" (
    "id" TEXT NOT NULL,
    "visitaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "dataAnterior" TIMESTAMP(3) NOT NULL,
    "novaData" TIMESTAMP(3) NOT NULL,
    "motivo" TEXT NOT NULL,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitaReagendamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitaHistorico" (
    "id" TEXT NOT NULL,
    "visitaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "observacao" TEXT,
    "statusAnterior" "StatusVisita",
    "statusNovo" "StatusVisita",
    "dados" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitaHistorico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitaAnexo" (
    "id" TEXT NOT NULL,
    "visitaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "arquivo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "comentario" TEXT,
    "etapa" "EtapaVisita" NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitaAnexo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VisitaCliente_numero_key" ON "VisitaCliente"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "VisitaCliente_protocolo_key" ON "VisitaCliente"("protocolo");

-- CreateIndex
CREATE UNIQUE INDEX "VisitaCliente_sacId_key" ON "VisitaCliente"("sacId");

-- CreateIndex
CREATE INDEX "VisitaCliente_responsavelId_status_idx" ON "VisitaCliente"("responsavelId", "status");

-- CreateIndex
CREATE INDEX "VisitaCliente_clienteId_dataPrevista_idx" ON "VisitaCliente"("clienteId", "dataPrevista");

-- CreateIndex
CREATE INDEX "VisitaCliente_status_dataPrevista_idx" ON "VisitaCliente"("status", "dataPrevista");

-- CreateIndex
CREATE INDEX "VisitaCliente_tipoVisita_idx" ON "VisitaCliente"("tipoVisita");

-- CreateIndex
CREATE INDEX "VisitaParticipante_visitaId_idx" ON "VisitaParticipante"("visitaId");

-- CreateIndex
CREATE INDEX "VisitaRealizacao_visitaId_criadoEm_idx" ON "VisitaRealizacao"("visitaId", "criadoEm");

-- CreateIndex
CREATE INDEX "VisitaValidacao_visitaId_criadoEm_idx" ON "VisitaValidacao"("visitaId", "criadoEm");

-- CreateIndex
CREATE INDEX "VisitaReagendamento_visitaId_criadoEm_idx" ON "VisitaReagendamento"("visitaId", "criadoEm");

-- CreateIndex
CREATE INDEX "VisitaHistorico_visitaId_criadoEm_idx" ON "VisitaHistorico"("visitaId", "criadoEm");

-- CreateIndex
CREATE INDEX "VisitaAnexo_visitaId_etapa_idx" ON "VisitaAnexo"("visitaId", "etapa");

-- AddForeignKey
ALTER TABLE "VisitaCliente" ADD CONSTRAINT "VisitaCliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitaCliente" ADD CONSTRAINT "VisitaCliente_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitaCliente" ADD CONSTRAINT "VisitaCliente_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitaCliente" ADD CONSTRAINT "VisitaCliente_sacId_fkey" FOREIGN KEY ("sacId") REFERENCES "AtendimentoSac"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitaParticipante" ADD CONSTRAINT "VisitaParticipante_visitaId_fkey" FOREIGN KEY ("visitaId") REFERENCES "VisitaCliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitaParticipante" ADD CONSTRAINT "VisitaParticipante_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitaRealizacao" ADD CONSTRAINT "VisitaRealizacao_visitaId_fkey" FOREIGN KEY ("visitaId") REFERENCES "VisitaCliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitaRealizacao" ADD CONSTRAINT "VisitaRealizacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitaValidacao" ADD CONSTRAINT "VisitaValidacao_visitaId_fkey" FOREIGN KEY ("visitaId") REFERENCES "VisitaCliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitaValidacao" ADD CONSTRAINT "VisitaValidacao_gestorId_fkey" FOREIGN KEY ("gestorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitaReagendamento" ADD CONSTRAINT "VisitaReagendamento_visitaId_fkey" FOREIGN KEY ("visitaId") REFERENCES "VisitaCliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitaReagendamento" ADD CONSTRAINT "VisitaReagendamento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitaHistorico" ADD CONSTRAINT "VisitaHistorico_visitaId_fkey" FOREIGN KEY ("visitaId") REFERENCES "VisitaCliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitaHistorico" ADD CONSTRAINT "VisitaHistorico_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitaAnexo" ADD CONSTRAINT "VisitaAnexo_visitaId_fkey" FOREIGN KEY ("visitaId") REFERENCES "VisitaCliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitaAnexo" ADD CONSTRAINT "VisitaAnexo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

