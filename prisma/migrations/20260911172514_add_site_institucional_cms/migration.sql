-- CreateTable
CREATE TABLE "PaginaSite" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "conteudoRascunho" JSONB,
    "conteudoPublicado" JSONB,
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "temAlteracoesNaoPublicadas" BOOLEAN NOT NULL DEFAULT false,
    "publicadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaginaSite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaginaSite_slug_key" ON "PaginaSite"("slug");
