-- CreateTable
CREATE TABLE "HelpCenterArticle" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "questions" TEXT[] NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[] NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HelpCenterArticle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HelpCenterArticle_active_category_idx" ON "HelpCenterArticle"("active", "category");

-- CreateIndex
CREATE INDEX "HelpCenterArticle_createdAt_idx" ON "HelpCenterArticle"("createdAt");

-- AddForeignKey
ALTER TABLE "HelpCenterArticle" ADD CONSTRAINT "HelpCenterArticle_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpCenterArticle" ADD CONSTRAINT "HelpCenterArticle_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
