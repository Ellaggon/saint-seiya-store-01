import type { PreorderRepository } from "@/domain/repositories/PreorderRepository";
import { ApplicationError } from "@/application/errors/ApplicationError";
import { PreorderMapper } from "@/application/dto/preorder.mapper";
import type { PreorderReservationDTO } from "@/application/dto/preorder.dto";
import { prisma } from "@/infrastructure/database/prisma";

export interface ListPreorderReservationsInput {
  preorderId: string;
  /** When false, skip the campaign existence query (caller already loaded it). */
  ensureCampaign?: boolean;
}

export class ListPreorderReservations {
  constructor(private readonly preorderRepository: PreorderRepository) {}

  async execute(
    input: ListPreorderReservationsInput,
  ): Promise<PreorderReservationDTO[]> {
    if (input.ensureCampaign !== false) {
      const campaign = await this.preorderRepository.findCampaignById(
        input.preorderId,
      );
      if (!campaign) {
        throw ApplicationError.invalidPreorderState("Preorder not found");
      }
    }

    const reservations = await this.preorderRepository.listReservationsByCampaign(
      input.preorderId,
    );

    const dtos = reservations.map(PreorderMapper.reservationToDTO);
    if (dtos.length === 0) return dtos;

    const pendingPayments = await prisma.preorderPayment.findMany({
      where: {
        reservationId: { in: dtos.map((r) => r.id) },
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
    });

    const proofByReservation = new Map<
      string,
      { proofUrl: string | null; amount: number }
    >();

    for (const payment of pendingPayments) {
      if (proofByReservation.has(payment.reservationId)) continue;
      const meta =
        typeof payment.metadata === "object" && payment.metadata !== null
          ? (payment.metadata as Record<string, unknown>)
          : {};
      proofByReservation.set(payment.reservationId, {
        proofUrl: typeof meta.proofUrl === "string" ? meta.proofUrl : null,
        amount: Number(payment.amount),
      });
    }

    return dtos.map((dto) => {
      const pending = proofByReservation.get(dto.id);
      return {
        ...dto,
        pendingProofUrl: pending?.proofUrl ?? null,
        pendingPaymentAmount: pending?.amount ?? null,
      };
    });
  }
}
