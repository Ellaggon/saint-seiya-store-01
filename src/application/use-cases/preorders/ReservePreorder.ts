import { PreorderPaymentKind, PreorderPaymentStatus } from "@/domain/entities/PreorderPayment";
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
  paymentMode: PreorderPaymentMode;
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

    const reservation = await this.preorderRepository.reserve({
      campaignId: input.preorderId,
      userId: input.userId,
      quantity: input.quantity,
      unitPrice: pricing.unitPrice,
      payInFull: input.paymentMode === "FULL",
      requestedAt: input.now,
      expiresAt: input.expiresAt,
    });

    const payment = await this.createPaymentDraft(input, reservation);

    return {
      reservation: PreorderMapper.reservationToDTO(reservation),
      payment: PreorderMapper.paymentToDTO(payment),
    };
  }

  private async createPaymentDraft(
    input: ReservePreorderInput,
    reservation: Awaited<ReturnType<PreorderRepository["reserve"]>>,
  ) {
    try {
      return await this.preorderRepository.registerPayment({
        reservationId: reservation.id,
        kind:
          input.paymentMode === "FULL"
            ? PreorderPaymentKind.FULL
            : PreorderPaymentKind.DEPOSIT,
        amount:
          input.paymentMode === "FULL"
            ? reservation.totalAmount
            : reservation.depositRequired,
        status: PreorderPaymentStatus.PENDING,
        createdAt: input.now,
      });
    } catch (error) {
      await this.preorderRepository.cancelReservation(reservation.id, input.userId ?? undefined);
      throw ApplicationError.invalidPreorderState(
        error instanceof Error
          ? error.message
          : "Unable to create preorder payment draft",
      );
    }
  }
}
