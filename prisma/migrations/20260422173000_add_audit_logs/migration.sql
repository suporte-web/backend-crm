-- CreateEnum
CREATE TYPE "AuditLogCategory" AS ENUM (
    'ACCESS',
    'AUTH',
    'USER',
    'CLIENT',
    'QUOTE',
    'TICKET',
    'TRACKING',
    'SYSTEM'
);

-- CreateEnum
CREATE TYPE "AuditLogLevel" AS ENUM (
    'INFO',
    'WARNING',
    'ERROR'
);

-- CreateEnum
CREATE TYPE "AuditLogAction" AS ENUM (
    'LOGIN',
    'LOGOUT',
    'LOGIN_FAILED',
    'SESSION_VALIDATED',
    'USER_CREATED',
    'USER_UPDATED',
    'USER_DELETED',
    'USER_STATUS_CHANGED',
    'CLIENT_CREATED',
    'CLIENT_UPDATED',
    'QUOTE_CREATED',
    'QUOTE_STATUS_CHANGED',
    'QUOTE_RESPONDED',
    'TICKET_CREATED',
    'TICKET_STATUS_CHANGED',
    'TRACKING_QUERIED',
    'TRACKING_UPDATED',
    'CUSTOM'
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "category" "AuditLogCategory" NOT NULL,
    "action" "AuditLogAction" NOT NULL,
    "level" "AuditLogLevel" NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "route" TEXT,
    "method" TEXT,
    "targetType" TEXT,
    "targetId" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_category_createdAt_idx" ON "AuditLog"("category", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_success_createdAt_idx" ON "AuditLog"("success", "createdAt");

-- AddForeignKey
ALTER TABLE "AuditLog"
ADD CONSTRAINT "AuditLog_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
