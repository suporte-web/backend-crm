-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "cargoDescription" TEXT,
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "deliveryAddress" TEXT,
ADD COLUMN     "merchandiseValue" DECIMAL(65,30),
ADD COLUMN     "pickupAddress" TEXT,
ADD COLUMN     "requestType" TEXT;
