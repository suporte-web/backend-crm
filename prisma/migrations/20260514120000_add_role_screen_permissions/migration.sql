-- CreateTable
CREATE TABLE "RoleScreenPermission" (
    "id" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "screenKey" TEXT NOT NULL,
    "screenLabel" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleScreenPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoleScreenPermission_role_screenKey_key" ON "RoleScreenPermission"("role", "screenKey");
CREATE INDEX "RoleScreenPermission_role_isEnabled_idx" ON "RoleScreenPermission"("role", "isEnabled");
