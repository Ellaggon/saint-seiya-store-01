import type { PreorderRepository } from "@/domain/repositories/PreorderRepository";
import { ApplicationError } from "@/application/errors/ApplicationError";
import { PreorderMapper } from "@/application/dto/preorder.mapper";
import type { PreorderReservationDTO } from "@/application/dto/preorder.dto";

export interface CancelReservationInput {
  reservationId: string;
  actorUserId?: string | null;
  actorRole: "CUSTOMER" | "ADMIN";
}

export class CancelReservation {
  constructor(private readonly preorderRepository: PreorderRepository) {}

  async execute(input: CancelReservationInput): Promise<PreorderReservationDTO> {
    if (input.actorRole === "CUSTOMER" && !input.actorUserId) {
      throw ApplicationError.unauthorized();
    }

    const reservation = await this.preorderRepository.cancelReservation(
      input.reservationId,
      input.actorRole === "CUSTOMER" ? input.actorUserId ?? undefined : undefined,
    );

    if (!reservation) {
      throw ApplicationError.reservationNotFound(input.reservationId);
    }

    return PreorderMapper.reservationToDTO(reservation);
  }
}
