import {
  PreorderCampaignStatus,
} from "@/domain/entities/PreorderCampaign";
import type {
  PreorderAvailabilityFilter,
  PreorderRepository,
  PreorderSort,
} from "@/domain/repositories/PreorderRepository";
import { Money } from "@/domain/value-objects/Money";
import { PreorderPricingService } from "@/domain/services/PreorderPricingService";
import { PreorderMapper } from "@/application/dto/preorder.mapper";
import type {
  PaginatedResultDTO,
  PreorderListItemDTO,
} from "@/application/dto/preorder.dto";

export interface ListPreordersInput {
  status?: PreorderCampaignStatus;
  category?: string;
  collection?: string;
  character?: string;
  availability?: PreorderAvailabilityFilter;
  etaFrom?: Date;
  etaTo?: Date;
  minPrice?: number;
  maxPrice?: number;
  sort?: PreorderSort;
  page?: number;
  pageSize?: number;
}

export class ListPreorders {
  private readonly pricingService = new PreorderPricingService();

  constructor(private readonly preorderRepository: PreorderRepository) {}

  async execute(
    input: ListPreordersInput = {},
  ): Promise<PaginatedResultDTO<PreorderListItemDTO>> {
    const result = await this.preorderRepository.listCampaignsWithProducts({
      status: input.status,
      category: input.category,
      collection: input.collection,
      character: input.character,
      availability: input.availability,
      etaFrom: input.etaFrom,
      etaTo: input.etaTo,
      minPrice:
        input.minPrice !== undefined ? Money.from(input.minPrice) : undefined,
      maxPrice:
        input.maxPrice !== undefined ? Money.from(input.maxPrice) : undefined,
      sort: input.sort,
      page: input.page,
      pageSize: input.pageSize,
    });

    return {
      ...result,
      items: result.items.map((item) => {
        const pricing = this.pricingService.calculate({
          unitPrice: item.product.price,
          quantity: 1,
          campaign: item.campaign,
          payInFull: false,
        });

        return {
          campaign: PreorderMapper.campaignToDTO(item.campaign),
          product: {
            id: item.product.id,
            name: item.product.name,
            slug: item.product.slug,
            imageUrl: item.product.imageUrl,
            price: item.product.price.toNumber(),
            status: item.product.status,
            category: item.product.category,
            collection: item.product.collection,
            characters: item.product.characters,
          },
          pricing: {
            unitPrice: pricing.unitPrice.toNumber(),
            quantity: pricing.quantity,
            totalAmount: pricing.totalAmount.toNumber(),
            depositRequired: pricing.depositRequired.toNumber(),
            amountDueNow: pricing.amountDueNow.toNumber(),
            balanceDue: pricing.balanceDue.toNumber(),
            allowFullPayment: item.campaign.allowFullPayment,
          },
        };
      }),
    };
  }
}
