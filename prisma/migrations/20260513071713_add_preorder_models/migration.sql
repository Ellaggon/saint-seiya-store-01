-- CreateEnum
CREATE TYPE "PreorderCampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'SOLD_OUT', 'ARRIVED', 'CLOSED', 'CANCELED');

-- CreateEnum
CREATE TYPE "PreorderDepositType" AS ENUM ('PERCENT', 'FIXED', 'FULL');

-- CreateEnum
CREATE TYPE "PreorderReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PARTIALLY_PAID', 'PAID', 'CANCELED', 'EXPIRED', 'FULFILLED');

-- CreateEnum
CREATE TYPE "PreorderPaymentKind" AS ENUM ('DEPOSIT', 'FULL', 'BALANCE');

-- CreateEnum
CREATE TYPE "PreorderPaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PreorderPaymentProvider" AS ENUM ('MANUAL', 'STRIPE', 'MERCADOPAGO', 'WEBPAY', 'PAYPAL');

-- CreateTable
CREATE TABLE "PreorderCampaign" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "status" "PreorderCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "totalSlots" INTEGER NOT NULL,
    "depositType" "PreorderDepositType" NOT NULL DEFAULT 'PERCENT',
    "depositValue" DECIMAL(12,2) NOT NULL,
    "allowFullPayment" BOOLEAN NOT NULL DEFAULT true,
    "opensAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "releaseDate" TIMESTAMP(3),
    "etaStart" TIMESTAMP(3),
    "etaEnd" TIMESTAMP(3),
    "etaLabel" TEXT,
    "terms" TEXT,
    "arrivalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PreorderCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreorderReservation" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "depositRequired" DECIMAL(12,2) NOT NULL,
    "status" "PreorderReservationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreorderReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreorderPayment" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "kind" "PreorderPaymentKind" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "PreorderPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider" "PreorderPaymentProvider",
    "providerPaymentId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "PreorderPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PreorderCampaign_productId_idx" ON "PreorderCampaign"("productId");

-- CreateIndex
CREATE INDEX "PreorderCampaign_status_idx" ON "PreorderCampaign"("status");

-- CreateIndex
CREATE INDEX "PreorderCampaign_opensAt_idx" ON "PreorderCampaign"("opensAt");

-- CreateIndex
CREATE INDEX "PreorderCampaign_etaStart_idx" ON "PreorderCampaign"("etaStart");

-- CreateIndex
CREATE INDEX "PreorderCampaign_deletedAt_idx" ON "PreorderCampaign"("deletedAt");

-- CreateIndex
CREATE INDEX "PreorderReservation_campaignId_idx" ON "PreorderReservation"("campaignId");

-- CreateIndex
CREATE INDEX "PreorderReservation_userId_idx" ON "PreorderReservation"("userId");

-- CreateIndex
CREATE INDEX "PreorderReservation_status_idx" ON "PreorderReservation"("status");

-- CreateIndex
CREATE INDEX "PreorderReservation_expiresAt_idx" ON "PreorderReservation"("expiresAt");

-- CreateIndex
CREATE INDEX "PreorderReservation_campaignId_userId_idx" ON "PreorderReservation"("campaignId", "userId");

-- CreateIndex
CREATE INDEX "PreorderPayment_reservationId_idx" ON "PreorderPayment"("reservationId");

-- CreateIndex
CREATE INDEX "PreorderPayment_status_idx" ON "PreorderPayment"("status");

-- CreateIndex
CREATE INDEX "PreorderPayment_provider_providerPaymentId_idx" ON "PreorderPayment"("provider", "providerPaymentId");

-- AddForeignKey
ALTER TABLE "PreorderCampaign" ADD CONSTRAINT "PreorderCampaign_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreorderReservation" ADD CONSTRAINT "PreorderReservation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "PreorderCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreorderReservation" ADD CONSTRAINT "PreorderReservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreorderPayment" ADD CONSTRAINT "PreorderPayment_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "PreorderReservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
