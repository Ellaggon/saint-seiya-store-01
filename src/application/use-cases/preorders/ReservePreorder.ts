import { PreorderPaymentKind } from "@/domain/entities/PreorderPayment";
import type { PreorderRepository } from "@/domain/repositories/PreorderRepository";
import { PreorderPricingService } from "@/domain/services/PreorderPricingService";
import { ApplicationError } from "@/application/errors/ApplicationError";
import { PreorderMapper } from "@/application/dto/preorder.mapper";
import type {
  PreorderPaymentDTO,
  PreorderReservationDTO,
} from "@/application/dto/preorder.dto";

export type PreorderPaymentMode = "DEPOSIT" | "FULL";

export interface ReservePreorderInput {
  preorderId: string;
  userId?: string | null;
  quantity: number;
  paymentMode: string;
  now: Date;
  expiresAt?: Date | null;
}

export interface ReservePreorderResultDTO {
  reservation: PreorderReservationDTO;
  payment: PreorderPaymentDTO;
}

export class ReservePreorder {
  private readonly pricingService = new PreorderPricingService();

  constructor(private readonly preorderRepository: PreorderRepository) {}

  async execute(input: ReservePreorderInput): Promise<ReservePreorderResultDTO> {
    if (!input.userId) throw ApplicationError.unauthorized();
    if (!isPreorderPaymentMode(input.paymentMode)) {
      throw ApplicationError.invalidPaymentMode(input.paymentMode);
    }

    try {
      const detail = await this.preorderRepository.findCampaignDetail({
        id: input.preorderId,
      });
      if (!detail) throw ApplicationError.preorderClosed(input.preorderId);

      const { campaign, product } = detail;
      if (campaign.isSoldOut) throw ApplicationError.preorderSoldOut(input.preorderId);
      if (!campaign.isOpen(input.now)) {
        throw ApplicationError.preorderClosed(input.preorderId);
      }

      const pricing = this.pricingService.calculate({
        unitPrice: product.price,
        quantity: input.quantity,
        campaign,
        payInFull: input.paymentMode === "FULL",
      });

      const result = await this.preorderRepository.reserveWithPaymentDraft({
        campaignId: input.preorderId,
        userId: input.userId,
        quantity: input.quantity,
        unitPrice: pricing.unitPrice,
        payInFull: input.paymentMode === "FULL",
        requestedAt: input.now,
        expiresAt: input.expiresAt,
        paymentKind:
          input.paymentMode === "FULL"
            ? PreorderPaymentKind.FULL
            : PreorderPaymentKind.DEPOSIT,
        paymentAmount:
          input.paymentMode === "FULL"
            ? pricing.totalAmount
            : pricing.depositRequired,
        paymentCreatedAt: input.now,
      });

      return {
        reservation: PreorderMapper.reservationToDTO(result.reservation),
        payment: PreorderMapper.paymentToDTO(result.payment),
      };
    } catch (error) {
      throw ApplicationError.normalizeUnknownError(error);
    }
  }
}

const isPreorderPaymentMode = (value: string): value is PreorderPaymentMode =>
  value === "DEPOSIT" || value === "FULL";
