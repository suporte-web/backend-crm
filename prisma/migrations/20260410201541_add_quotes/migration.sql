-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('RECEIVED', 'IN_ANALYSIS', 'ANSWERED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'CLOSED');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('RECEIVED', 'PREPARING', 'COLLECTED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'ISSUE');

-- CreateEnum
CREATE TYPE "MessageSenderType" AS ENUM ('CLIENT', 'AGENT', 'AI');

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "weight" DOUBLE PRECISION,
    "volume" DOUBLE PRECISION,
    "quantity" INTEGER,
    "desiredDeadline" TIMESTAMP(3),
    "notes" TEXT,
    "price" DECIMAL(65,30),
    "commercialNotes" TEXT,
    "status" "QuoteStatus" NOT NULL DEFAULT 'RECEIVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteHistory" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteHistory" ADD CONSTRAINT "QuoteHistory_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
