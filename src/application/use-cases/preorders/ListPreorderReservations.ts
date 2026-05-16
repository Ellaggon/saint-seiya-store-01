import type { PreorderRepository } from "@/domain/repositories/PreorderRepository";
import { ApplicationError } from "@/application/errors/ApplicationError";
import { PreorderMapper } from "@/application/dto/preorder.mapper";
import type { PreorderReservationDTO } from "@/application/dto/preorder.dto";

export interface ListPreorderReservationsInput {
  preorderId: string;
}

export class ListPreorderReservations {
  constructor(private readonly preorderRepository: PreorderRepository) {}

  async execute(
    input: ListPreorderReservationsInput,
  ): Promise<PreorderReservationDTO[]> {
    const campaign = await this.preorderRepository.findCampaignById(
      input.preorderId,
    );
    if (!campaign) {
      throw ApplicationError.invalidPreorderState("Preorder not found");
    }

    const reservations = await this.preorderRepository.listReservationsByCampaign(
      input.preorderId,
    );

    return reservations.map(PreorderMapper.reservationToDTO);
  }
}
