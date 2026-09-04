CREATE TABLE "manifesto_ssw" (
    "id" SERIAL NOT NULL,
    "manifesto_ssw" TEXT NOT NULL,
    "chave_manifesto_ssw" TEXT,
    "placa" TEXT NOT NULL,
    "placa_carreta" TEXT,
    "motorista_cpf" TEXT,
    "motorista_nome" TEXT,
    "data_emissao" TIMESTAMP(3),
    "data_prev_chegada" TIMESTAMP(3),
    "recebido_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manifesto_ssw_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "manifesto_ssw_ctrc" (
    "id" SERIAL NOT NULL,
    "manifesto_id" INTEGER NOT NULL,
    "ctrc_ssw" TEXT NOT NULL,

    CONSTRAINT "manifesto_ssw_ctrc_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "manifesto_ssw_manifesto_ssw_key"
ON "manifesto_ssw"("manifesto_ssw");

CREATE INDEX "manifesto_ssw_data_emissao_idx"
ON "manifesto_ssw"("data_emissao");

CREATE INDEX "manifesto_ssw_ctrc_ctrc_ssw_idx"
ON "manifesto_ssw_ctrc"("ctrc_ssw");

CREATE UNIQUE INDEX "manifesto_ssw_ctrc_manifesto_id_ctrc_ssw_key"
ON "manifesto_ssw_ctrc"("manifesto_id", "ctrc_ssw");

ALTER TABLE "manifesto_ssw_ctrc"
ADD CONSTRAINT "manifesto_ssw_ctrc_manifesto_id_fkey"
FOREIGN KEY ("manifesto_id")
REFERENCES "manifesto_ssw"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;