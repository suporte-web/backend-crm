-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('NOTICIA', 'INFORMACAO', 'VLOG');

-- CreateTable
CREATE TABLE "PortalContent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "coverImageUrl" TEXT,
    "videoUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PortalContent_type_isPublished_publishedAt_idx" ON "PortalContent"("type", "isPublished", "publishedAt");

-- CreateIndex
CREATE INDEX "PortalContent_authorId_createdAt_idx" ON "PortalContent"("authorId", "createdAt");

-- AddForeignKey
ALTER TABLE "PortalContent"
ADD CONSTRAINT "PortalContent_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
