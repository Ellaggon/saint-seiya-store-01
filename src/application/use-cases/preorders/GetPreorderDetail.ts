import type { PreorderRepository } from "@/domain/repositories/PreorderRepository";
import { PreorderPricingService } from "@/domain/services/PreorderPricingService";
import { ApplicationError } from "@/application/errors/ApplicationError";
import { PreorderMapper } from "@/application/dto/preorder.mapper";
import type { PreorderDetailDTO } from "@/application/dto/preorder.dto";

export interface GetPreorderDetailInput {
  id?: string;
  productSlug?: string;
  quantity?: number;
  payInFull?: boolean;
}

export class GetPreorderDetail {
  private readonly pricingService = new PreorderPricingService();

  constructor(private readonly preorderRepository: PreorderRepository) {}

  async execute(input: GetPreorderDetailInput): Promise<PreorderDetailDTO> {
    const detail = await this.preorderRepository.findCampaignDetail({
      id: input.id,
      productSlug: input.productSlug,
    });

    if (!detail) {
      throw ApplicationError.invalidPreorderState("Preorder not found");
    }

    const pricing = this.pricingService.calculate({
      unitPrice: detail.product.price,
      quantity: input.quantity ?? 1,
      campaign: detail.campaign,
      payInFull: input.payInFull ?? false,
    });

    return {
      campaign: PreorderMapper.campaignToDTO(detail.campaign),
      product: {
        id: detail.product.id,
        name: detail.product.name,
        slug: detail.product.slug,
        imageUrl: detail.product.imageUrl,
        price: detail.product.price.toNumber(),
        status: detail.product.status,
        category: detail.product.category,
        collection: detail.product.collection,
        characters: detail.product.characters,
      },
      availability: {
        totalSlots: detail.campaign.totalSlots,
        reservedUnits: detail.campaign.reservedUnits,
        availableUnits: detail.campaign.availableUnits,
        isSoldOut: detail.campaign.isSoldOut,
      },
      eta: {
        releaseDate: detail.campaign.releaseDate?.toISOString() ?? null,
        etaStart: detail.campaign.etaStart?.toISOString() ?? null,
        etaEnd: detail.campaign.etaEnd?.toISOString() ?? null,
        etaLabel: detail.campaign.etaLabel,
      },
      terms: detail.campaign.terms,
      arrivalNotes: detail.campaign.arrivalNotes,
      pricing: {
        unitPrice: pricing.unitPrice.toNumber(),
        quantity: pricing.quantity,
        totalAmount: pricing.totalAmount.toNumber(),
        depositRequired: pricing.depositRequired.toNumber(),
        amountDueNow: pricing.amountDueNow.toNumber(),
        balanceDue: pricing.balanceDue.toNumber(),
        allowFullPayment: detail.campaign.allowFullPayment,
      },
    };
  }
}
