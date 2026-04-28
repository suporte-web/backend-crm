-- Repair drift from previously marked migrations and add the ticket center schema.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TicketStatus') THEN
    CREATE TYPE "TicketStatus" AS ENUM (
      'NEW',
      'IN_PROGRESS',
      'WAITING_CUSTOMER',
      'CLOSED',
      'NOVO',
      'ABERTO',
      'EM_ANDAMENTO',
      'AGUARDANDO_CLIENTE',
      'AGUARDANDO_COMERCIAL',
      'AGUARDANDO_GESTAO',
      'RESPONDIDO',
      'APROVADO_CLIENTE',
      'APROVADO_GESTAO',
      'AJUSTE_SOLICITADO',
      'REPROVADO',
      'FECHADO',
      'CANCELADO'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MessageSenderType') THEN
    CREATE TYPE "MessageSenderType" AS ENUM ('CLIENT', 'AGENT', 'CLIENTE', 'INTERNO', 'AI');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LeadTimelineEventType') THEN
    CREATE TYPE "LeadTimelineEventType" AS ENUM (
      'CREATED_MANUAL',
      'IMPORTED_CSV',
      'UPDATED',
      'WHATSAPP_CREATED',
      'WHATSAPP_INTERACTION',
      'NOTE_ADDED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LeadImportJobStatus') THEN
    CREATE TYPE "LeadImportJobStatus" AS ENUM (
      'PROCESSING',
      'COMPLETED',
      'COMPLETED_WITH_ERRORS',
      'FAILED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LeadImportRowStatus') THEN
    CREATE TYPE "LeadImportRowStatus" AS ENUM ('IMPORTED', 'SKIPPED', 'FAILED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TicketType') THEN
    CREATE TYPE "TicketType" AS ENUM (
      'COTACAO',
      'LEAD',
      'PRE_NEGOCIACAO',
      'APROVACAO_GESTAO',
      'AJUSTE_CLIENTE',
      'AJUSTE_GESTAO',
      'SUPORTE',
      'DOCUMENTACAO',
      'OPERACIONAL'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TicketHistoryEventType') THEN
    CREATE TYPE "TicketHistoryEventType" AS ENUM (
      'CREATED',
      'STATUS_CHANGED',
      'MESSAGE_SENT',
      'INTERNAL_NOTE',
      'NOTIFICATION_SENT',
      'EMAIL_SENT',
      'PRE_PROPOSAL_SENT',
      'APPROVAL_SENT',
      'APPROVED',
      'REJECTED',
      'ADJUSTMENT_REQUESTED',
      'CLOSED'
    );
  END IF;
END $$;

ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'NEW';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'WAITING_CUSTOMER';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'CLOSED';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'NOVO';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'ABERTO';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'EM_ANDAMENTO';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'AGUARDANDO_CLIENTE';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'AGUARDANDO_COMERCIAL';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'AGUARDANDO_GESTAO';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'RESPONDIDO';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'APROVADO_CLIENTE';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'APROVADO_GESTAO';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'AJUSTE_SOLICITADO';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'REPROVADO';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'FECHADO';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'CANCELADO';

ALTER TYPE "MessageSenderType" ADD VALUE IF NOT EXISTS 'CLIENT';
ALTER TYPE "MessageSenderType" ADD VALUE IF NOT EXISTS 'AGENT';
ALTER TYPE "MessageSenderType" ADD VALUE IF NOT EXISTS 'CLIENTE';
ALTER TYPE "MessageSenderType" ADD VALUE IF NOT EXISTS 'INTERNO';
ALTER TYPE "MessageSenderType" ADD VALUE IF NOT EXISTS 'AI';

-- Repair lead capture objects if the migration table says they exist but the schema does not.
CREATE TABLE IF NOT EXISTS "Lead" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "company" TEXT,
  "source" TEXT NOT NULL DEFAULT 'manual',
  "status" TEXT NOT NULL DEFAULT 'new',
  "notes" TEXT,
  "normalizedEmail" TEXT,
  "normalizedPhone" TEXT,
  "channel" TEXT,
  "sourcePhone" TEXT,
  "externalMessageId" TEXT,
  "externalContactId" TEXT,
  "metadata" JSONB,
  "rawPayload" JSONB,
  "lastInteractionAt" TIMESTAMP(3),
  "createdById" TEXT,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "company" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'new';
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "normalizedEmail" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "normalizedPhone" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "channel" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "sourcePhone" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "externalMessageId" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "externalContactId" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "rawPayload" JSONB;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "lastInteractionAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "Lead_normalizedEmail_idx" ON "Lead"("normalizedEmail");
CREATE INDEX IF NOT EXISTS "Lead_normalizedPhone_idx" ON "Lead"("normalizedPhone");
CREATE INDEX IF NOT EXISTS "Lead_source_createdAt_idx" ON "Lead"("source", "createdAt");
CREATE INDEX IF NOT EXISTS "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Lead_createdById_fkey') THEN
    ALTER TABLE "Lead"
      ADD CONSTRAINT "Lead_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Lead_updatedById_fkey') THEN
    ALTER TABLE "Lead"
      ADD CONSTRAINT "Lead_updatedById_fkey"
      FOREIGN KEY ("updatedById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "LeadTimelineEvent" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "type" "LeadTimelineEventType" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "metadata" JSONB,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadTimelineEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LeadTimelineEvent_leadId_createdAt_idx" ON "LeadTimelineEvent"("leadId", "createdAt");
CREATE INDEX IF NOT EXISTS "LeadTimelineEvent_type_createdAt_idx" ON "LeadTimelineEvent"("type", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LeadTimelineEvent_leadId_fkey') THEN
    ALTER TABLE "LeadTimelineEvent"
      ADD CONSTRAINT "LeadTimelineEvent_leadId_fkey"
      FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LeadTimelineEvent_createdById_fkey') THEN
    ALTER TABLE "LeadTimelineEvent"
      ADD CONSTRAINT "LeadTimelineEvent_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "LeadImportJob" (
  "id" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "sourceFileType" TEXT NOT NULL,
  "totalRows" INTEGER NOT NULL DEFAULT 0,
  "successCount" INTEGER NOT NULL DEFAULT 0,
  "ignoredCount" INTEGER NOT NULL DEFAULT 0,
  "failureCount" INTEGER NOT NULL DEFAULT 0,
  "status" "LeadImportJobStatus" NOT NULL DEFAULT 'PROCESSING',
  "summary" JSONB,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "LeadImportJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LeadImportJob_createdAt_idx" ON "LeadImportJob"("createdAt");
CREATE INDEX IF NOT EXISTS "LeadImportJob_status_createdAt_idx" ON "LeadImportJob"("status", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LeadImportJob_createdById_fkey') THEN
    ALTER TABLE "LeadImportJob"
      ADD CONSTRAINT "LeadImportJob_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "LeadImportRowResult" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "rowNumber" INTEGER NOT NULL,
  "status" "LeadImportRowStatus" NOT NULL,
  "reason" TEXT,
  "rawData" JSONB,
  "leadId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadImportRowResult_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LeadImportRowResult_jobId_rowNumber_idx" ON "LeadImportRowResult"("jobId", "rowNumber");
CREATE INDEX IF NOT EXISTS "LeadImportRowResult_leadId_idx" ON "LeadImportRowResult"("leadId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LeadImportRowResult_jobId_fkey') THEN
    ALTER TABLE "LeadImportRowResult"
      ADD CONSTRAINT "LeadImportRowResult_jobId_fkey"
      FOREIGN KEY ("jobId") REFERENCES "LeadImportJob"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LeadImportRowResult_leadId_fkey') THEN
    ALTER TABLE "LeadImportRowResult"
      ADD CONSTRAINT "LeadImportRowResult_leadId_fkey"
      FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Repair Quote and Opportunity columns used by the commercial flow.
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "requestType" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "pickupAddress" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "deliveryAddress" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "cargoDescription" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "contactName" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "contactPhone" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "contactEmail" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "merchandiseValue" DECIMAL(65,30);

ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "quoteId" TEXT;
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "preContract" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "preContractNotes" TEXT;

CREATE INDEX IF NOT EXISTS "Opportunity_quoteId_idx" ON "Opportunity"("quoteId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Opportunity_quoteId_fkey') THEN
    ALTER TABLE "Opportunity"
      ADD CONSTRAINT "Opportunity_quoteId_fkey"
      FOREIGN KEY ("quoteId") REFERENCES "Quote"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Ticket center columns and relations.
-- TicketStatus values are only used by the application after this migration commits.
ALTER TABLE "Ticket" ALTER COLUMN "clientId" DROP NOT NULL;
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "quoteId" TEXT;
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "leadId" TEXT;
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "opportunityId" TEXT;
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "assignedToId" TEXT;
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "requesterId" TEXT;
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "type" "TicketType" NOT NULL DEFAULT 'SUPORTE';
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "requiresActionRole" "UserRole";
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "lastInteractionAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "Ticket_clientId_idx" ON "Ticket"("clientId");
CREATE INDEX IF NOT EXISTS "Ticket_quoteId_idx" ON "Ticket"("quoteId");
CREATE INDEX IF NOT EXISTS "Ticket_leadId_idx" ON "Ticket"("leadId");
CREATE INDEX IF NOT EXISTS "Ticket_opportunityId_idx" ON "Ticket"("opportunityId");
CREATE INDEX IF NOT EXISTS "Ticket_assignedToId_status_idx" ON "Ticket"("assignedToId", "status");
CREATE INDEX IF NOT EXISTS "Ticket_type_status_idx" ON "Ticket"("type", "status");
CREATE INDEX IF NOT EXISTS "Ticket_requiresActionRole_status_idx" ON "Ticket"("requiresActionRole", "status");
CREATE INDEX IF NOT EXISTS "Ticket_status_createdAt_idx" ON "Ticket"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Ticket_lastInteractionAt_idx" ON "Ticket"("lastInteractionAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Ticket_quoteId_fkey') THEN
    ALTER TABLE "Ticket"
      ADD CONSTRAINT "Ticket_quoteId_fkey"
      FOREIGN KEY ("quoteId") REFERENCES "Quote"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Ticket_leadId_fkey') THEN
    ALTER TABLE "Ticket"
      ADD CONSTRAINT "Ticket_leadId_fkey"
      FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Ticket_opportunityId_fkey') THEN
    ALTER TABLE "Ticket"
      ADD CONSTRAINT "Ticket_opportunityId_fkey"
      FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Ticket_assignedToId_fkey') THEN
    ALTER TABLE "Ticket"
      ADD CONSTRAINT "Ticket_assignedToId_fkey"
      FOREIGN KEY ("assignedToId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Ticket_requesterId_fkey') THEN
    ALTER TABLE "Ticket"
      ADD CONSTRAINT "Ticket_requesterId_fkey"
      FOREIGN KEY ("requesterId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "TicketMessage" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "senderType" "MessageSenderType" NOT NULL,
  "message" TEXT NOT NULL,
  "isInternal" BOOLEAN NOT NULL DEFAULT false,
  "attachments" JSONB,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TicketMessage" ADD COLUMN IF NOT EXISTS "isInternal" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TicketMessage" ADD COLUMN IF NOT EXISTS "attachments" JSONB;

CREATE INDEX IF NOT EXISTS "TicketMessage_ticketId_createdAt_idx" ON "TicketMessage"("ticketId", "createdAt");
CREATE INDEX IF NOT EXISTS "TicketMessage_createdById_createdAt_idx" ON "TicketMessage"("createdById", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TicketMessage_ticketId_fkey') THEN
    ALTER TABLE "TicketMessage"
      ADD CONSTRAINT "TicketMessage_ticketId_fkey"
      FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TicketMessage_createdById_fkey') THEN
    ALTER TABLE "TicketMessage"
      ADD CONSTRAINT "TicketMessage_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "TicketHistory" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "eventType" "TicketHistoryEventType" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "metadata" JSONB,
  "internalOnly" BOOLEAN NOT NULL DEFAULT false,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TicketHistory_ticketId_createdAt_idx" ON "TicketHistory"("ticketId", "createdAt");
CREATE INDEX IF NOT EXISTS "TicketHistory_eventType_createdAt_idx" ON "TicketHistory"("eventType", "createdAt");
CREATE INDEX IF NOT EXISTS "TicketHistory_createdById_createdAt_idx" ON "TicketHistory"("createdById", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TicketHistory_ticketId_fkey') THEN
    ALTER TABLE "TicketHistory"
      ADD CONSTRAINT "TicketHistory_ticketId_fkey"
      FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TicketHistory_createdById_fkey') THEN
    ALTER TABLE "TicketHistory"
      ADD CONSTRAINT "TicketHistory_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "ticketId" TEXT,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "link" TEXT,
  "metadata" JSONB,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_ticketId_createdAt_idx" ON "Notification"("ticketId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notification_userId_fkey') THEN
    ALTER TABLE "Notification"
      ADD CONSTRAINT "Notification_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notification_ticketId_fkey') THEN
    ALTER TABLE "Notification"
      ADD CONSTRAINT "Notification_ticketId_fkey"
      FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
