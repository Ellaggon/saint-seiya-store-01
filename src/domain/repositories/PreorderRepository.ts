import type {
  PreorderCampaign,
  PreorderCampaignStatus,
} from "../entities/PreorderCampaign";
import type { PreorderPayment } from "../entities/PreorderPayment";
import type {
  PreorderPaymentKind,
  PreorderPaymentProvider,
  PreorderPaymentStatus,
} from "../entities/PreorderPayment";
import type { PreorderReservation } from "../entities/PreorderReservation";
import type { Money } from "../value-objects/Money";

export type PreorderAvailabilityFilter = "AVAILABLE" | "SOLD_OUT" | "OPEN";

export type PreorderSort =
  | "created-desc"
  | "eta-asc"
  | "price-asc"
  | "price-desc";

export interface PreorderCampaignFilters {
  productId?: string;
  status?: PreorderCampaignStatus;
  category?: string;
  collection?: string;
  character?: string;
  availability?: PreorderAvailabilityFilter;
  etaFrom?: Date;
  etaTo?: Date;
  minPrice?: Money;
  maxPrice?: Money;
  sort?: PreorderSort;
  includeDeleted?: boolean;
  page?: number;
  pageSize?: number;
}

export interface PreorderPaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CreatePreorderCampaignInput {
  campaign: PreorderCampaign;
}

export interface UpdatePreorderCampaignInput {
  campaign: PreorderCampaign;
}

export interface ReservePreorderInput {
  campaignId: string;
  userId: string;
  quantity: number;
  unitPrice: Money;
  payInFull: boolean;
  requestedAt: Date;
  expiresAt?: Date | null;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface RegisterPreorderPaymentInput {
  reservationId: string;
  kind: PreorderPaymentKind;
  amount: Money;
  status: PreorderPaymentStatus;
  provider?: PreorderPaymentProvider | null;
  providerPaymentId?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
  paidAt?: Date | null;
  createdAt: Date;
}

export interface ReservePreorderWithPaymentDraftInput extends ReservePreorderInput {
  paymentKind: PreorderPaymentKind;
  paymentAmount: Money;
  paymentCreatedAt: Date;
}

export interface ReservePreorderWithPaymentDraftResult {
  reservation: PreorderReservation;
  payment: PreorderPayment;
}

export interface PreorderProductSummary {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  price: Money;
  status: string;
  category?: { id: string; name: string; slug: string } | null;
  collection?: { id: string; name: string; slug: string } | null;
  characters?: { id: string; name: string; slug: string }[];
}

export interface PreorderCampaignWithProduct {
  campaign: PreorderCampaign;
  product: PreorderProductSummary;
}

export interface PreorderDetailLookup {
  id?: string;
  productSlug?: string;
}

export interface PreorderRepository {
  createCampaign(input: CreatePreorderCampaignInput): Promise<PreorderCampaign>;
  updateCampaign(input: UpdatePreorderCampaignInput): Promise<PreorderCampaign>;
  findCampaignById(id: string): Promise<PreorderCampaign | null>;
  findCampaignDetail(
    lookup: PreorderDetailLookup,
  ): Promise<PreorderCampaignWithProduct | null>;
  findCampaignByProductId(productId: string): Promise<PreorderCampaign[]>;
  listCampaigns(
    filters?: PreorderCampaignFilters,
  ): Promise<PreorderPaginatedResult<PreorderCampaign>>;
  listCampaignsWithProducts(
    filters?: PreorderCampaignFilters,
  ): Promise<PreorderPaginatedResult<PreorderCampaignWithProduct>>;

  reserve(input: ReservePreorderInput): Promise<PreorderReservation>;
  reserveWithPaymentDraft(
    input: ReservePreorderWithPaymentDraftInput,
  ): Promise<ReservePreorderWithPaymentDraftResult>;
  findReservationById(id: string): Promise<PreorderReservation | null>;
  listReservationsByCampaign(campaignId: string): Promise<PreorderReservation[]>;

  cancelReservation(
    id: string,
    userId?: string,
  ): Promise<PreorderReservation | null>;

  markArrived(id: string): Promise<PreorderCampaign | null>;

  registerPayment(input: RegisterPreorderPaymentInput): Promise<PreorderPayment>;
  listPaymentsByReservation(reservationId: string): Promise<PreorderPayment[]>;
}
