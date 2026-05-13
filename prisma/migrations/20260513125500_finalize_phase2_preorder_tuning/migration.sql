-- AlterTable
ALTER TABLE "PreorderPayment" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "PreorderReservation_campaignId_status_idx" ON "PreorderReservation"("campaignId", "status");
