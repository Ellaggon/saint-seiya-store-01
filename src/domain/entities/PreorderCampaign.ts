export enum PreorderCampaignStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  SOLD_OUT = "SOLD_OUT",
  ARRIVED = "ARRIVED",
  CLOSED = "CLOSED",
  CANCELED = "CANCELED",
}

export enum PreorderDepositType {
  PERCENT = "PERCENT",
  FIXED = "FIXED",
  FULL = "FULL",
}

export interface PreorderCampaignProps {
  id: string;
  productId: string;
  status: PreorderCampaignStatus;
  totalSlots: number;
  reservedUnits: number;
  perCustomerLimit?: number;
  depositType: PreorderDepositType;
  depositValue: number;
  allowFullPayment: boolean;
  opensAt?: Date | null;
  closesAt?: Date | null;
  releaseDate?: Date | null;
  etaStart?: Date | null;
  etaEnd?: Date | null;
  etaLabel?: string | null;
  terms?: string | null;
  arrivalNotes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export class PreorderCampaign {
  private constructor(private readonly props: PreorderCampaignProps) {
    this.validate();
  }

  get id(): string {
    return this.props.id;
  }

  get productId(): string {
    return this.props.productId;
  }

  get status(): PreorderCampaignStatus {
    return this.props.status;
  }

  get totalSlots(): number {
    return this.props.totalSlots;
  }

  get reservedUnits(): number {
    return this.props.reservedUnits;
  }

  get availableUnits(): number {
    return Math.max(this.props.totalSlots - this.props.reservedUnits, 0);
  }

  get isSoldOut(): boolean {
    return (
      this.props.status === PreorderCampaignStatus.SOLD_OUT ||
      this.availableUnits === 0
    );
  }

  get perCustomerLimit(): number | undefined {
    return this.props.perCustomerLimit;
  }

  get depositType(): PreorderDepositType {
    return this.props.depositType;
  }

  get depositValue(): number {
    return this.props.depositValue;
  }

  get allowFullPayment(): boolean {
    return this.props.allowFullPayment;
  }

  get opensAt(): Date | null | undefined {
    return this.props.opensAt;
  }

  get closesAt(): Date | null | undefined {
    return this.props.closesAt;
  }

  static create(props: PreorderCampaignProps): PreorderCampaign {
    return new PreorderCampaign(props);
  }

  isOpen(now: Date): boolean {
    if (this.props.deletedAt) {
      return false;
    }

    if (this.props.status !== PreorderCampaignStatus.ACTIVE) {
      return false;
    }

    if (this.props.opensAt && now < this.props.opensAt) {
      return false;
    }

    if (this.props.closesAt && now > this.props.closesAt) {
      return false;
    }

    return true;
  }

  canReserve(quantity: number, userExistingQuantity: number, now: Date): boolean {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return false;
    }

    if (!Number.isInteger(userExistingQuantity) || userExistingQuantity < 0) {
      return false;
    }

    if (!this.isOpen(now) || this.isSoldOut) {
      return false;
    }

    if (quantity > this.availableUnits) {
      return false;
    }

    if (
      this.props.perCustomerLimit !== undefined &&
      userExistingQuantity + quantity > this.props.perCustomerLimit
    ) {
      return false;
    }

    return true;
  }

  private validate(): void {
    if (!Number.isInteger(this.props.totalSlots) || this.props.totalSlots <= 0) {
      throw new Error("Preorder campaign totalSlots must be a positive integer");
    }

    if (
      !Number.isInteger(this.props.reservedUnits) ||
      this.props.reservedUnits < 0
    ) {
      throw new Error("Preorder campaign reservedUnits must be a non-negative integer");
    }

    if (
      this.props.perCustomerLimit !== undefined &&
      (!Number.isInteger(this.props.perCustomerLimit) ||
        this.props.perCustomerLimit <= 0)
    ) {
      throw new Error("Preorder campaign perCustomerLimit must be a positive integer");
    }

    if (!Number.isFinite(this.props.depositValue) || this.props.depositValue < 0) {
      throw new Error("Preorder campaign depositValue must be non-negative");
    }

    if (
      this.props.opensAt &&
      this.props.closesAt &&
      this.props.opensAt > this.props.closesAt
    ) {
      throw new Error("Preorder campaign opensAt cannot be after closesAt");
    }

    if (
      this.props.etaStart &&
      this.props.etaEnd &&
      this.props.etaStart > this.props.etaEnd
    ) {
      throw new Error("Preorder campaign etaStart cannot be after etaEnd");
    }
  }
}
