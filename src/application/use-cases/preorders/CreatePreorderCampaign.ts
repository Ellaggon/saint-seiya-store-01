import {
  PreorderCampaign,
  PreorderCampaignStatus,
  PreorderDepositType,
} from "@/domain/entities/PreorderCampaign";
import type { ProductRepository } from "@/domain/repositories/ProductRepository";
import type { PreorderRepository } from "@/domain/repositories/PreorderRepository";
import { PreorderPricingService } from "@/domain/services/PreorderPricingService";
import { Money } from "@/domain/value-objects/Money";
import { ApplicationError } from "@/application/errors/ApplicationError";
import { PreorderMapper } from "@/application/dto/preorder.mapper";
import type { PreorderCampaignDTO } from "@/application/dto/preorder.dto";

export interface CreatePreorderCampaignInput {
  productId: string;
  totalSlots: number;
  depositType: PreorderDepositType;
  depositValue: number;
  allowFullPayment?: boolean;
  opensAt?: Date | null;
  closesAt?: Date | null;
  releaseDate?: Date | null;
  etaStart?: Date | null;
  etaEnd?: Date | null;
  etaLabel?: string | null;
  terms?: string | null;
  arrivalNotes?: string | null;
  now: Date;
}

export class CreatePreorderCampaign {
  private readonly pricingService = new PreorderPricingService();

  constructor(
    private readonly preorderRepository: PreorderRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(input: CreatePreorderCampaignInput): Promise<PreorderCampaignDTO> {
    const product = await this.productRepository.findById(input.productId);
    if (!product) throw ApplicationError.productNotFound(input.productId);

    if (!Number.isInteger(input.totalSlots) || input.totalSlots <= 0) {
      throw ApplicationError.invalidPreorderState("totalSlots must be positive");
    }

    const activeCampaigns = await this.preorderRepository.findCampaignByProductId(
      input.productId,
    );
    if (
      activeCampaigns.some((campaign) =>
        [
          PreorderCampaignStatus.ACTIVE,
          PreorderCampaignStatus.PAUSED,
          PreorderCampaignStatus.SOLD_OUT,
        ].includes(campaign.status),
      )
    ) {
      throw ApplicationError.preorderAlreadyExists(input.productId);
    }

    const campaign = PreorderCampaign.create({
      id: crypto.randomUUID(),
      productId: input.productId,
      status: PreorderCampaignStatus.DRAFT,
      totalSlots: input.totalSlots,
      reservedUnits: 0,
      depositType: input.depositType,
      depositValue: input.depositValue,
      allowFullPayment: input.allowFullPayment ?? true,
      opensAt: input.opensAt,
      closesAt: input.closesAt,
      releaseDate: input.releaseDate,
      etaStart: input.etaStart,
      etaEnd: input.etaEnd,
      etaLabel: input.etaLabel,
      terms: input.terms,
      arrivalNotes: input.arrivalNotes,
      createdAt: input.now,
      updatedAt: input.now,
      deletedAt: null,
    });

    try {
      this.pricingService.calculate({
        unitPrice: Money.from(product.price),
        quantity: 1,
        campaign,
        payInFull: false,
      });
    } catch (error) {
      throw ApplicationError.invalidDeposit(
        error instanceof Error ? error.message : "Invalid deposit configuration",
      );
    }

    const created = await this.preorderRepository.createCampaign({ campaign });
    return PreorderMapper.campaignToDTO(created);
  }
}
