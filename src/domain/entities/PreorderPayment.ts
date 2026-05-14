import { Money } from "../value-objects/Money";

export enum PreorderPaymentKind {
  DEPOSIT = "DEPOSIT",
  FULL = "FULL",
  BALANCE = "BALANCE",
}

export enum PreorderPaymentStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  FAILED = "FAILED",
  CANCELED = "CANCELED",
  REFUNDED = "REFUNDED",
}

export enum PreorderPaymentProvider {
  MANUAL = "MANUAL",
  STRIPE = "STRIPE",
  MERCADOPAGO = "MERCADOPAGO",
  WEBPAY = "WEBPAY",
  PAYPAL = "PAYPAL",
}

export interface PreorderPaymentProps {
  id: string;
  reservationId: string;
  kind: PreorderPaymentKind;
  amount: Money;
  status: PreorderPaymentStatus;
  provider?: PreorderPaymentProvider | null;
  providerPaymentId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date | null;
}

export class PreorderPayment {
  private constructor(private readonly props: PreorderPaymentProps) {
    if (this.props.amount.equals(Money.zero())) {
      throw new Error("Preorder payment amount must be greater than zero");
    }
  }

  get id(): string {
    return this.props.id;
  }

  get reservationId(): string {
    return this.props.reservationId;
  }

  get kind(): PreorderPaymentKind {
    return this.props.kind;
  }

  get amount(): Money {
    return this.props.amount;
  }

  get status(): PreorderPaymentStatus {
    return this.props.status;
  }

  get isPaid(): boolean {
    return this.props.status === PreorderPaymentStatus.PAID;
  }

  static create(props: PreorderPaymentProps): PreorderPayment {
    return new PreorderPayment(props);
  }

  static sumPaid(payments: PreorderPayment[]): Money {
    return payments.reduce(
      (total, payment) => (payment.isPaid ? total.add(payment.amount) : total),
      Money.zero(),
    );
  }
}
