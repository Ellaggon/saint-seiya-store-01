import { PreorderReservationStatus } from "@/domain/entities/PreorderReservation";
import type { PreorderRepository } from "@/domain/repositories/PreorderRepository";
import { ApplicationError } from "@/application/errors/ApplicationError";
import { PreorderMapper } from "@/application/dto/preorder.mapper";
import type {
  PreorderCampaignDTO,
  PreorderReservationDTO,
} from "@/application/dto/preorder.dto";

export interface MarkArrivedInput {
  preorderId: string;
}

export interface MarkArrivedResultDTO {
  campaign: PreorderCampaignDTO;
  awaitingBalance: PreorderReservationDTO[];
  readyToShip: PreorderReservationDTO[];
}

export class MarkArrived {
  constructor(private readonly preorderRepository: PreorderRepository) {}

  async execute(input: MarkArrivedInput): Promise<MarkArrivedResultDTO> {
    const campaign = await this.preorderRepository.markArrived(input.preorderId);
    if (!campaign) throw ApplicationError.invalidPreorderState("Preorder not found");

    const reservations = await this.preorderRepository.listReservationsByCampaign(
      input.preorderId,
    );

    return {
      campaign: PreorderMapper.campaignToDTO(campaign),
      awaitingBalance: reservations
        .filter((reservation) =>
          [
            PreorderReservationStatus.CONFIRMED,
            PreorderReservationStatus.PARTIALLY_PAID,
          ].includes(reservation.status),
        )
        .map(PreorderMapper.reservationToDTO),
      readyToShip: reservations
        .filter((reservation) => reservation.status === PreorderReservationStatus.PAID)
        .map(PreorderMapper.reservationToDTO),
    };
  }
}
