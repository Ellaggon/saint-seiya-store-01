-- CreateEnum
CREATE TYPE "OrderPaymentMethod" AS ENUM ('QR_BANK', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "OrderPaymentStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'PAID', 'REJECTED', 'CANCELED');

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'AWAITING_PAYMENT';
ALTER TABLE "Order" ADD COLUMN "customerName" TEXT;
ALTER TABLE "Order" ADD COLUMN "customerPhone" TEXT;
ALTER TABLE "Order" ADD COLUMN "customerCity" TEXT;
ALTER TABLE "Order" ADD COLUMN "customerNote" TEXT;
ALTER TABLE "Order" ADD COLUMN "paymentMethod" "OrderPaymentMethod" NOT NULL DEFAULT 'QR_BANK';
ALTER TABLE "Order" ADD COLUMN "referenceCode" TEXT;
ALTER TABLE "Order" ADD COLUMN "guestAccessToken" TEXT;

-- Backfill reference codes for existing orders
UPDATE "Order"
SET "referenceCode" = 'SAN-' || UPPER(SUBSTRING(REPLACE("id", '-', '') FROM 1 FOR 6))
WHERE "referenceCode" IS NULL;

ALTER TABLE "Order" ALTER COLUMN "referenceCode" SET NOT NULL;

CREATE UNIQUE INDEX "Order_referenceCode_key" ON "Order"("referenceCode");
CREATE UNIQUE INDEX "Order_guestAccessToken_key" ON "Order"("guestAccessToken");
CREATE INDEX "Order_referenceCode_idx" ON "Order"("referenceCode");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateTable
CREATE TABLE "OrderPayment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "OrderPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider" "OrderPaymentMethod" NOT NULL DEFAULT 'QR_BANK',
    "proofUrl" TEXT,
    "proofUploadedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "OrderPayment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderPayment_orderId_idx" ON "OrderPayment"("orderId");
CREATE INDEX "OrderPayment_status_idx" ON "OrderPayment"("status");

ALTER TABLE "OrderPayment" ADD CONSTRAINT "OrderPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
