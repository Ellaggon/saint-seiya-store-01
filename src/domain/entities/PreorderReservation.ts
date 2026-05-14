import { Money } from "../value-objects/Money";

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

  static create(props: PreorderReservationProps): PreorderReservation {
    return new PreorderReservation(props);
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
      : PreorderReservationStatus.PARTIALLY_PAID;

    return new PreorderReservation({
      ...this.props,
      paidAmount: nextPaidAmount,
      status: nextStatus,
      confirmedAt:
        this.props.confirmedAt ??
        (nextPaidAmount.greaterThan(Money.zero()) ? confirmedAt : undefined),
    });
  }

  cancel(canceledAt?: Date): PreorderReservation {
    if (this.props.status === PreorderReservationStatus.FULFILLED) {
      throw new Error("Cannot cancel a fulfilled preorder reservation");
    }

    if (this.props.status === PreorderReservationStatus.CANCELED) {
      return this;
    }

    return new PreorderReservation({
      ...this.props,
      status: PreorderReservationStatus.CANCELED,
      canceledAt,
    });
  }

  expire(now: Date): PreorderReservation {
    if (
      this.props.status === PreorderReservationStatus.CONFIRMED ||
      this.props.status === PreorderReservationStatus.PARTIALLY_PAID ||
      this.props.status === PreorderReservationStatus.PAID ||
      this.props.status === PreorderReservationStatus.FULFILLED ||
      this.props.status === PreorderReservationStatus.CANCELED
    ) {
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

    if (
      this.props.paidAmount.equals(Money.zero()) ||
      this.props.paidAmount.equals(this.props.totalAmount)
    ) {
      throw new Error("Awaiting balance requires a partial payment");
    }

    return new PreorderReservation({
      ...this.props,
      status: PreorderReservationStatus.PARTIALLY_PAID,
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
