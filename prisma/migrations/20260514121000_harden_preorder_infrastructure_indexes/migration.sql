-- Improve active-reservation lookup used by preorder reservation transactions.
CREATE INDEX "PreorderReservation_campaignId_userId_status_idx"
ON "PreorderReservation"("campaignId", "userId", "status");

-- Enforce payment-provider idempotency at the database level.
DROP INDEX "PreorderPayment_provider_providerPaymentId_idx";

CREATE UNIQUE INDEX "PreorderPayment_provider_providerPaymentId_key"
ON "PreorderPayment"("provider", "providerPaymentId");
