import { Money } from "../value-objects/Money";
import { PreorderPayment } from "./PreorderPayment";

export enum PreorderReservationStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  PARTIALLY_PAID = "PARTIALLY_PAID",
  PAID = "PAID",
  CANCELED = "CANCELED",
  EXPIRED = "EXPIRED",
  FULFILLED = "FULFILLED",
}

export interface PreorderReservationProps {
  id: string;
  campaignId: string;
  userId: string;
  quantity: number;
  unitPrice: Money;
  totalAmount: Money;
  depositRequired: Money;
  paidAmount: Money;
  status: PreorderReservationStatus;
  expiresAt?: Date | null;
  confirmedAt?: Date | null;
  canceledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PreorderReservation {
  private constructor(private readonly props: PreorderReservationProps) {
    this.validate();
  }

  get id(): string {
    return this.props.id;
  }

  get campaignId(): string {
    return this.props.campaignId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get quantity(): number {
    return this.props.quantity;
  }

  get unitPrice(): Money {
    return this.props.unitPrice;
  }

  get totalAmount(): Money {
    return this.props.totalAmount;
  }

  get depositRequired(): Money {
    return this.props.depositRequired;
  }

  get paidAmount(): Money {
    return this.props.paidAmount;
  }

  get status(): PreorderReservationStatus {
    return this.props.status;
  }

  get expiresAt(): Date | null | undefined {
    return this.props.expiresAt;
  }

  get confirmedAt(): Date | null | undefined {
    return this.props.confirmedAt;
  }

  get canceledAt(): Date | null | undefined {
    return this.props.canceledAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  static create(props: PreorderReservationProps): PreorderReservation {
    return new PreorderReservation(props);
  }

  static paidAmountFromPayments(payments: PreorderPayment[]): Money {
    return PreorderPayment.sumPaid(payments);
  }

  confirmPayment(amount: Money, confirmedAt?: Date): PreorderReservation {
    if (
      this.props.status === PreorderReservationStatus.CANCELED ||
      this.props.status === PreorderReservationStatus.EXPIRED ||
      this.props.status === PreorderReservationStatus.FULFILLED
    ) {
      throw new Error("Cannot confirm payment for an inactive preorder reservation");
    }

    if (amount.equals(Money.zero())) {
      throw new Error("Payment amount must be greater than zero");
    }

    const nextPaidAmount = this.props.paidAmount.add(amount);

    if (nextPaidAmount.greaterThan(this.props.totalAmount)) {
      throw new Error("Payment amount cannot exceed reservation total");
    }

    const nextStatus = nextPaidAmount.equals(this.props.totalAmount)
      ? PreorderReservationStatus.PAID
      : nextPaidAmount.greaterThan(this.props.depositRequired) ||
          nextPaidAmount.equals(this.props.depositRequired)
        ? PreorderReservationStatus.CONFIRMED
        : PreorderReservationStatus.PARTIALLY_PAID;
    const isConfirmed =
      nextStatus === PreorderReservationStatus.CONFIRMED ||
      nextStatus === PreorderReservationStatus.PAID;

    return new PreorderReservation({
      ...this.props,
      paidAmount: nextPaidAmount,
      status: nextStatus,
      confirmedAt: this.props.confirmedAt ?? (isConfirmed ? confirmedAt : undefined),
    });
  }

  cancel(canceledAt?: Date): PreorderReservation {
    if (
      this.props.status === PreorderReservationStatus.PAID ||
      this.props.status === PreorderReservationStatus.FULFILLED
    ) {
      throw new Error("Cannot cancel a paid or fulfilled preorder reservation");
    }

    if (this.props.paidAmount.greaterThan(Money.zero())) {
      throw new Error("Cannot cancel a paid preorder reservation without a refund workflow");
    }

    if (
      this.props.status === PreorderReservationStatus.CANCELED ||
      this.props.status === PreorderReservationStatus.EXPIRED
    ) {
      return this;
    }

    return new PreorderReservation({
      ...this.props,
      status: PreorderReservationStatus.CANCELED,
      canceledAt,
    });
  }

  expire(now: Date): PreorderReservation {
    if (this.props.status !== PreorderReservationStatus.PENDING) {
      return this;
    }

    if (!this.props.expiresAt || now < this.props.expiresAt) {
      return this;
    }

    return new PreorderReservation({
      ...this.props,
      status: PreorderReservationStatus.EXPIRED,
    });
  }

  markAwaitingBalance(): PreorderReservation {
    if (
      this.props.status === PreorderReservationStatus.CANCELED ||
      this.props.status === PreorderReservationStatus.EXPIRED ||
      this.props.status === PreorderReservationStatus.FULFILLED
    ) {
      throw new Error("Cannot mark inactive preorder reservation as awaiting balance");
    }

    if (this.props.paidAmount.equals(Money.zero())) {
      throw new Error("Awaiting balance requires a paid deposit");
    }

    if (this.props.paidAmount.greaterThan(this.props.totalAmount)) {
      throw new Error("Paid amount cannot exceed reservation total");
    }

    if (this.props.paidAmount.equals(this.props.totalAmount)) {
      throw new Error("Paid preorder reservation has no balance pending");
    }

    if (
      !this.props.paidAmount.greaterThan(this.props.depositRequired) &&
      !this.props.paidAmount.equals(this.props.depositRequired)
    ) {
      throw new Error("Awaiting balance requires deposit payment to be satisfied");
    }

    return new PreorderReservation({
      ...this.props,
      status: PreorderReservationStatus.CONFIRMED,
    });
  }

  private validate(): void {
    if (!Number.isInteger(this.props.quantity) || this.props.quantity <= 0) {
      throw new Error("Preorder reservation quantity must be a positive integer");
    }

    if (this.props.depositRequired.greaterThan(this.props.totalAmount)) {
      throw new Error("Deposit required cannot exceed reservation total");
    }

    if (this.props.paidAmount.greaterThan(this.props.totalAmount)) {
      throw new Error("Paid amount cannot exceed reservation total");
    }
  }
}
