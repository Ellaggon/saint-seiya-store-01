import type { PreorderCampaign } from "@/domain/entities/PreorderCampaign";
import type { PreorderPayment } from "@/domain/entities/PreorderPayment";
import type { PreorderReservation } from "@/domain/entities/PreorderReservation";

import type {
  PreorderCampaignDTO,
  PreorderPaymentDTO,
  PreorderReservationDTO,
} from "./preorder.dto";

const toIso = (value: Date | null | undefined): string | null =>
  value ? value.toISOString() : null;

export class PreorderMapper {
  static campaignToDTO(campaign: PreorderCampaign): PreorderCampaignDTO {
    return {
      id: campaign.id,
      productId: campaign.productId,
      status: campaign.status,
      totalSlots: campaign.totalSlots,
      reservedUnits: campaign.reservedUnits,
      availableUnits: campaign.availableUnits,
      isSoldOut: campaign.isSoldOut,
      depositType: campaign.depositType,
      depositValue: campaign.depositValue,
      allowFullPayment: campaign.allowFullPayment,
      opensAt: toIso(campaign.opensAt),
      closesAt: toIso(campaign.closesAt),
      releaseDate: toIso(campaign.releaseDate),
      etaStart: toIso(campaign.etaStart),
      etaEnd: toIso(campaign.etaEnd),
      etaLabel: campaign.etaLabel,
      terms: campaign.terms,
      arrivalNotes: campaign.arrivalNotes,
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
    };
  }

  static reservationToDTO(
    reservation: PreorderReservation,
  ): PreorderReservationDTO {
    return {
      id: reservation.id,
      campaignId: reservation.campaignId,
      userId: reservation.userId,
      quantity: reservation.quantity,
      unitPrice: reservation.unitPrice.toNumber(),
      totalAmount: reservation.totalAmount.toNumber(),
      depositRequired: reservation.depositRequired.toNumber(),
      paidAmount: reservation.paidAmount.toNumber(),
      balanceDue: reservation.totalAmount
        .subtract(reservation.paidAmount)
        .toNumber(),
      status: reservation.status,
      expiresAt: toIso(reservation.expiresAt),
      confirmedAt: toIso(reservation.confirmedAt),
      canceledAt: toIso(reservation.canceledAt),
      createdAt: reservation.createdAt.toISOString(),
      updatedAt: reservation.updatedAt.toISOString(),
    };
  }

  static paymentToDTO(payment: PreorderPayment): PreorderPaymentDTO {
    return {
      id: payment.id,
      reservationId: payment.reservationId,
      kind: payment.kind,
      amount: payment.amount.toNumber(),
      status: payment.status,
      provider: payment.provider,
      providerPaymentId: payment.providerPaymentId,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
      paidAt: toIso(payment.paidAt),
    };
  }
}
