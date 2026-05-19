import {
  PreorderReservation,
  PreorderReservationStatus,
} from "@/domain/entities/PreorderReservation";
import { Money } from "@/domain/value-objects/Money";
import { ApplicationError } from "@/application/errors/ApplicationError";

const inactivePaymentStatuses = new Set<PreorderReservationStatus>([
  PreorderReservationStatus.CANCELED,
  PreorderReservationStatus.EXPIRED,
  PreorderReservationStatus.FULFILLED,
]);

export const calculateReservationBalance = (
  reservation: PreorderReservation,
): Money => reservation.totalAmount.subtract(reservation.paidAmount);

export const assertReservationAcceptsPayment = (
  reservation: PreorderReservation,
): void => {
  if (inactivePaymentStatuses.has(reservation.status)) {
    throw ApplicationError.invalidReservationState(
      "Inactive preorder reservation cannot accept payments",
    );
  }
};

export const assertPositivePaymentAmount = (
  amount: Money,
  message = "Payment amount must be greater than zero",
): void => {
  if (amount.equals(Money.zero())) {
    throw ApplicationError.invalidPaymentAmount(message);
  }
};

export const assertPaymentWithinBalance = (
  amount: Money,
  balanceDue: Money,
): void => {
  if (amount.greaterThan(balanceDue)) {
    throw ApplicationError.paymentExceedsBalance();
  }
};

export const assertExactBalancePayment = (
  amount: Money,
  balanceDue: Money,
): void => {
  assertPaymentWithinBalance(amount, balanceDue);

  if (!amount.equals(balanceDue)) {
    throw ApplicationError.invalidPaymentAmount(
      "Balance payment amount must equal current balance due",
    );
  }
};
