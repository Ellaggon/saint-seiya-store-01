import {
  PreorderReservation,
  PreorderReservationStatus,
} from "@/domain/entities/PreorderReservation";
import { Money } from "@/domain/value-objects/Money";
import { ACTIVE_RESERVATION_STATUSES } from "@/infrastructure/database/mappers/preorder.mapper";

const now = new Date("2026-02-01T12:00:00.000Z");
const stale = new Date("2026-02-01T11:00:00.000Z");
const future = new Date("2026-02-01T13:00:00.000Z");

const assert = (condition: unknown, message: string): void => {
  if (!condition) throw new Error(message);
};

const buildReservation = (
  status: PreorderReservationStatus,
  expiresAt: Date | null,
  paidAmount = 0,
): PreorderReservation =>
  PreorderReservation.create({
    id: `reservation-${status}-${expiresAt?.toISOString() ?? "no-expiry"}`,
    campaignId: "campaign-1",
    userId: "user-1",
    quantity: 1,
    unitPrice: Money.from(100),
    totalAmount: Money.from(100),
    depositRequired: Money.from(30),
    paidAmount: Money.from(paidAmount),
    status,
    expiresAt,
    createdAt: new Date("2026-02-01T10:00:00.000Z"),
    updatedAt: new Date("2026-02-01T10:00:00.000Z"),
  });

const pendingExpired = buildReservation(
  PreorderReservationStatus.PENDING,
  stale,
).expire(now);

assert(
  pendingExpired.status === PreorderReservationStatus.EXPIRED,
  "stale pending reservation should expire",
);

const pendingFuture = buildReservation(
  PreorderReservationStatus.PENDING,
  future,
).expire(now);

assert(
  pendingFuture.status === PreorderReservationStatus.PENDING,
  "future pending reservation should remain pending",
);

const confirmed = buildReservation(
  PreorderReservationStatus.CONFIRMED,
  stale,
  30,
).expire(now);
const partiallyPaid = buildReservation(
  PreorderReservationStatus.PARTIALLY_PAID,
  stale,
  50,
).expire(now);
const paid = buildReservation(PreorderReservationStatus.PAID, stale, 100).expire(
  now,
);

assert(
  confirmed.status === PreorderReservationStatus.CONFIRMED,
  "confirmed reservation should not expire",
);
assert(
  partiallyPaid.status === PreorderReservationStatus.PARTIALLY_PAID,
  "partially paid reservation should not expire",
);
assert(paid.status === PreorderReservationStatus.PAID, "paid reservation should not expire");

const expiredAgain = pendingExpired.expire(now);
assert(
  expiredAgain.status === PreorderReservationStatus.EXPIRED,
  "second expiration pass should be idempotent",
);

const activeStatusValues = ACTIVE_RESERVATION_STATUSES.map((status) =>
  status.toString(),
);
assert(
  !activeStatusValues.includes(PreorderReservationStatus.EXPIRED),
  "expired reservations should not count as active capacity",
);
assert(
  activeStatusValues.includes(PreorderReservationStatus.PENDING),
  "pending reservations should count as active capacity until they expire",
);

console.log("[smoke:preorder-expiration] ok pending expiration policy");
