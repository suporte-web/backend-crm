-- Extend audit actions used by the CRM screens.
ALTER TYPE "AuditLogAction" ADD VALUE IF NOT EXISTS 'TICKET_RESPONDED';
ALTER TYPE "AuditLogAction" ADD VALUE IF NOT EXISTS 'OPPORTUNITY_CREATED';
ALTER TYPE "AuditLogAction" ADD VALUE IF NOT EXISTS 'OPPORTUNITY_STAGE_CHANGED';
ALTER TYPE "AuditLogAction" ADD VALUE IF NOT EXISTS 'SUPPLIER_INVITED';

-- Supplier invitation status.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SupplierInviteStatus') THEN
    CREATE TYPE "SupplierInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');
  END IF;
END $$;

-- Commercial flow links.
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "contactEmail" TEXT;

ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "quoteId" TEXT;
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "preContract" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "preContractNotes" TEXT;

CREATE INDEX IF NOT EXISTS "Opportunity_quoteId_idx" ON "Opportunity"("quoteId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Opportunity_quoteId_fkey'
  ) THEN
    ALTER TABLE "Opportunity"
      ADD CONSTRAINT "Opportunity_quoteId_fkey"
      FOREIGN KEY ("quoteId") REFERENCES "Quote"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "quoteId" TEXT;

CREATE INDEX IF NOT EXISTS "Ticket_quoteId_idx" ON "Ticket"("quoteId");
CREATE INDEX IF NOT EXISTS "Ticket_status_createdAt_idx" ON "Ticket"("status", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Ticket_quoteId_fkey'
  ) THEN
    ALTER TABLE "Ticket"
      ADD CONSTRAINT "Ticket_quoteId_fkey"
      FOREIGN KEY ("quoteId") REFERENCES "Quote"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Ticket conversation.
CREATE TABLE IF NOT EXISTS "TicketMessage" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "senderType" "MessageSenderType" NOT NULL DEFAULT 'INTERNO',
  "message" TEXT NOT NULL,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TicketMessage_ticketId_createdAt_idx" ON "TicketMessage"("ticketId", "createdAt");
CREATE INDEX IF NOT EXISTS "TicketMessage_createdById_createdAt_idx" ON "TicketMessage"("createdById", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TicketMessage_ticketId_fkey'
  ) THEN
    ALTER TABLE "TicketMessage"
      ADD CONSTRAINT "TicketMessage_ticketId_fkey"
      FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TicketMessage_createdById_fkey'
  ) THEN
    ALTER TABLE "TicketMessage"
      ADD CONSTRAINT "TicketMessage_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Supplier invites.
CREATE TABLE IF NOT EXISTS "SupplierInvite" (
  "id" TEXT NOT NULL,
  "companyName" TEXT NOT NULL,
  "contactName" TEXT,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "token" TEXT NOT NULL,
  "status" "SupplierInviteStatus" NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "invitedById" TEXT,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SupplierInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SupplierInvite_token_key" ON "SupplierInvite"("token");
CREATE INDEX IF NOT EXISTS "SupplierInvite_email_createdAt_idx" ON "SupplierInvite"("email", "createdAt");
CREATE INDEX IF NOT EXISTS "SupplierInvite_status_createdAt_idx" ON "SupplierInvite"("status", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SupplierInvite_invitedById_fkey'
  ) THEN
    ALTER TABLE "SupplierInvite"
      ADD CONSTRAINT "SupplierInvite_invitedById_fkey"
      FOREIGN KEY ("invitedById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
