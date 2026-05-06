CREATE TYPE "ChatEntityType" AS ENUM ('LEAD', 'CLIENTE', 'COTACAO', 'PROPOSTA', 'TICKET');
CREATE TYPE "ChatMessageVisibility" AS ENUM ('PUBLICA_CLIENTE', 'INTERNA', 'GESTAO_COMERCIAL', 'PRIVADA_USUARIOS');

ALTER TYPE "AuditLogCategory" ADD VALUE IF NOT EXISTS 'CHAT';
ALTER TYPE "AuditLogAction" ADD VALUE IF NOT EXISTS 'CHAT_CREATED';
ALTER TYPE "AuditLogAction" ADD VALUE IF NOT EXISTS 'CHAT_PARTICIPANTS_CHANGED';
ALTER TYPE "AuditLogAction" ADD VALUE IF NOT EXISTS 'CHAT_MESSAGE_SENT';
ALTER TYPE "AuditLogAction" ADD VALUE IF NOT EXISTS 'CHAT_MESSAGE_UPDATED';
ALTER TYPE "AuditLogAction" ADD VALUE IF NOT EXISTS 'CHAT_MESSAGE_DELETED';
ALTER TYPE "AuditLogAction" ADD VALUE IF NOT EXISTS 'CHAT_MESSAGE_VISIBILITY_CHANGED';
ALTER TYPE "AuditLogAction" ADD VALUE IF NOT EXISTS 'PROPOSAL_SENT';
ALTER TYPE "AuditLogAction" ADD VALUE IF NOT EXISTS 'PROPOSAL_REJECTED';

CREATE TABLE "Chat" (
  "id" TEXT NOT NULL,
  "entityType" "ChatEntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "title" TEXT,
  "leadId" TEXT,
  "clientId" TEXT,
  "quoteId" TEXT,
  "propostaId" TEXT,
  "ticketId" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatParticipant" (
  "id" TEXT NOT NULL,
  "chatId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "canRead" BOOLEAN NOT NULL DEFAULT true,
  "canWrite" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ChatParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatMessage" (
  "id" TEXT NOT NULL,
  "chatId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "visibility" "ChatMessageVisibility" NOT NULL DEFAULT 'PUBLICA_CLIENTE',
  "editedAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatMessageRecipient" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,

  CONSTRAINT "ChatMessageRecipient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Chat_entityType_entityId_key" ON "Chat"("entityType", "entityId");
CREATE INDEX "Chat_clientId_idx" ON "Chat"("clientId");
CREATE INDEX "Chat_leadId_idx" ON "Chat"("leadId");
CREATE INDEX "Chat_quoteId_idx" ON "Chat"("quoteId");
CREATE INDEX "Chat_propostaId_idx" ON "Chat"("propostaId");
CREATE INDEX "Chat_ticketId_idx" ON "Chat"("ticketId");
CREATE INDEX "Chat_entityType_createdAt_idx" ON "Chat"("entityType", "createdAt");

CREATE UNIQUE INDEX "ChatParticipant_chatId_userId_key" ON "ChatParticipant"("chatId", "userId");
CREATE INDEX "ChatParticipant_userId_canRead_idx" ON "ChatParticipant"("userId", "canRead");
CREATE INDEX "ChatParticipant_chatId_canWrite_idx" ON "ChatParticipant"("chatId", "canWrite");

CREATE INDEX "ChatMessage_chatId_createdAt_idx" ON "ChatMessage"("chatId", "createdAt");
CREATE INDEX "ChatMessage_authorId_createdAt_idx" ON "ChatMessage"("authorId", "createdAt");
CREATE INDEX "ChatMessage_visibility_idx" ON "ChatMessage"("visibility");
CREATE INDEX "ChatMessage_deletedAt_idx" ON "ChatMessage"("deletedAt");

CREATE UNIQUE INDEX "ChatMessageRecipient_messageId_userId_key" ON "ChatMessageRecipient"("messageId", "userId");
CREATE INDEX "ChatMessageRecipient_userId_idx" ON "ChatMessageRecipient"("userId");

ALTER TABLE "Chat" ADD CONSTRAINT "Chat_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_propostaId_fkey" FOREIGN KEY ("propostaId") REFERENCES "Proposta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatMessageRecipient" ADD CONSTRAINT "ChatMessageRecipient_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatMessageRecipient" ADD CONSTRAINT "ChatMessageRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
