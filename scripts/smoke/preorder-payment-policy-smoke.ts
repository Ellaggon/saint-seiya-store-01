import {
  PreorderReservation,
  PreorderReservationStatus,
} from "@/domain/entities/PreorderReservation";
import { Money } from "@/domain/value-objects/Money";
import {
  assertExactBalancePayment,
  assertPaymentWithinBalance,
  assertReservationAcceptsPayment,
  calculateReservationBalance,
} from "@/application/services/PreorderPaymentPolicy";

const buildReservation = (
  status: PreorderReservationStatus,
  paidAmount: number,
): PreorderReservation =>
  PreorderReservation.create({
    id: `reservation-${status}-${paidAmount}`,
    campaignId: "campaign-1",
    userId: "user-1",
    quantity: 1,
    unitPrice: Money.from(100),
    totalAmount: Money.from(100),
    depositRequired: Money.from(30),
    paidAmount: Money.from(paidAmount),
    status,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  });

const assert = (condition: unknown, message: string): void => {
  if (!condition) throw new Error(message);
};

const expectThrows = (name: string, callback: () => void): void => {
  try {
    callback();
  } catch {
    console.log(`[smoke:preorder-payment] ok ${name}`);
    return;
  }

  throw new Error(`Expected ${name} to throw`);
};

const confirmed = buildReservation(PreorderReservationStatus.CONFIRMED, 30);
const balance = calculateReservationBalance(confirmed);

assert(balance.equals(Money.from(70)), "balance should be total minus paid");
assertReservationAcceptsPayment(confirmed);
assertPaymentWithinBalance(Money.from(25), balance);
assertExactBalancePayment(Money.from(70), balance);
console.log("[smoke:preorder-payment] ok balance and exact payment");

expectThrows("overpayment fails", () =>
  assertPaymentWithinBalance(Money.from(71), balance),
);
expectThrows("partial balance completion fails", () =>
  assertExactBalancePayment(Money.from(69), balance),
);
expectThrows("canceled reservation rejects payments", () =>
  assertReservationAcceptsPayment(
    buildReservation(PreorderReservationStatus.CANCELED, 0),
  ),
);
expectThrows("expired reservation rejects payments", () =>
  assertReservationAcceptsPayment(
    buildReservation(PreorderReservationStatus.EXPIRED, 0),
  ),
);

const pending = buildReservation(PreorderReservationStatus.PENDING, 0);
const canceled = pending.cancel(new Date("2026-01-02T00:00:00.000Z"));
const canceledAgain = canceled.cancel(new Date("2026-01-03T00:00:00.000Z"));
assert(canceledAgain === canceled, "double cancellation should be idempotent");
console.log("[smoke:preorder-payment] ok double cancellation idempotent");
