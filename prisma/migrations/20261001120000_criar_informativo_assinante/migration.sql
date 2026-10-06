CREATE TYPE "StatusInformativo" AS ENUM ('ATIVO', 'DESCADASTRADO');

CREATE TABLE "InformativoAssinante" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "StatusInformativo" NOT NULL DEFAULT 'ATIVO',
    "origem" TEXT NOT NULL DEFAULT 'SITE_PIZZATTOLOG',
    "aceitePrivacidade" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InformativoAssinante_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InformativoAssinante_email_key" ON "InformativoAssinante"("email");
