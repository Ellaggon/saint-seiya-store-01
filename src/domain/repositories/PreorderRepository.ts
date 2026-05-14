import type {
  PreorderCampaign,
  PreorderCampaignStatus,
} from "../entities/PreorderCampaign";
import type { PreorderReservation } from "../entities/PreorderReservation";

export interface PreorderCampaignFilters {
  productId?: string;
  status?: PreorderCampaignStatus;
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
  reservation: PreorderReservation;
}

export interface PreorderRepository {
  createCampaign(input: CreatePreorderCampaignInput): Promise<PreorderCampaign>;
  updateCampaign(input: UpdatePreorderCampaignInput): Promise<PreorderCampaign>;
  findCampaignById(id: string): Promise<PreorderCampaign | null>;
  findCampaignByProductId(productId: string): Promise<PreorderCampaign[]>;
  listCampaigns(
    filters?: PreorderCampaignFilters,
  ): Promise<PreorderPaginatedResult<PreorderCampaign>>;

  reserve(input: ReservePreorderInput): Promise<PreorderReservation>;

  cancelReservation(
    id: string,
    userId?: string,
  ): Promise<PreorderReservation | null>;

  markArrived(id: string): Promise<PreorderCampaign | null>;
}
