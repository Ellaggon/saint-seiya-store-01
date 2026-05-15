import type {
  PreorderCampaignStatus,
  PreorderDepositType,
} from "@/domain/entities/PreorderCampaign";
import type {
  PreorderPaymentKind,
  PreorderPaymentProvider,
  PreorderPaymentStatus,
} from "@/domain/entities/PreorderPayment";
import type { PreorderReservationStatus } from "@/domain/entities/PreorderReservation";

export interface PaginatedResultDTO<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PreorderProductSummaryDTO {
  id: string;
  name: string;
  slug?: string;
  imageUrl?: string | null;
  price?: number;
  status?: string;
  category?: { id: string; name: string; slug: string } | null;
  collection?: { id: string; name: string; slug: string } | null;
  characters?: { id: string; name: string; slug: string }[];
}

export interface PreorderCampaignDTO {
  id: string;
  productId: string;
  status: PreorderCampaignStatus;
  totalSlots: number;
  reservedUnits: number;
  availableUnits: number;
  isSoldOut: boolean;
  depositType: PreorderDepositType;
  depositValue: number;
  allowFullPayment: boolean;
  opensAt?: string | null;
  closesAt?: string | null;
  releaseDate?: string | null;
  etaStart?: string | null;
  etaEnd?: string | null;
  etaLabel?: string | null;
  terms?: string | null;
  arrivalNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PreorderReservationDTO {
  id: string;
  campaignId: string;
  userId: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  depositRequired: number;
  paidAmount: number;
  balanceDue: number;
  status: PreorderReservationStatus;
  expiresAt?: string | null;
  confirmedAt?: string | null;
  canceledAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PreorderPaymentDTO {
  id: string;
  reservationId: string;
  kind: PreorderPaymentKind;
  amount: number;
  status: PreorderPaymentStatus;
  provider?: PreorderPaymentProvider | null;
  providerPaymentId?: string | null;
  createdAt: string;
  updatedAt: string;
  paidAt?: string | null;
}

export interface PreorderListItemDTO {
  campaign: PreorderCampaignDTO;
  product?: PreorderProductSummaryDTO;
}

export interface PreorderPricingSummaryDTO {
  unitPrice: number;
  quantity: number;
  totalAmount: number;
  depositRequired: number;
  amountDueNow: number;
  balanceDue: number;
  allowFullPayment: boolean;
}

export interface PreorderDetailDTO {
  campaign: PreorderCampaignDTO;
  product?: PreorderProductSummaryDTO;
  availability: {
    totalSlots: number;
    reservedUnits: number;
    availableUnits: number;
    isSoldOut: boolean;
  };
  eta: {
    releaseDate?: string | null;
    etaStart?: string | null;
    etaEnd?: string | null;
    etaLabel?: string | null;
  };
  terms?: string | null;
  arrivalNotes?: string | null;
  pricing: PreorderPricingSummaryDTO;
}
