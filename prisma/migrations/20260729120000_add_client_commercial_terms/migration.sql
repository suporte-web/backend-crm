ALTER TABLE "Client"
  ADD COLUMN "paymentMethod" TEXT,
  ADD COLUMN "paymentTerm" TEXT,
  ADD COLUMN "contractValidity" TEXT,
  ADD COLUMN "priceAdjustment" TEXT,
  ADD COLUMN "invoiceContactName" TEXT,
  ADD COLUMN "invoiceContactEmail" TEXT,
  ADD COLUMN "invoiceContactPhone" TEXT,
  ADD COLUMN "commercialTermsNotes" TEXT;
