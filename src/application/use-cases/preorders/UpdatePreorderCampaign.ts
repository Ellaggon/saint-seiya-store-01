import {
  PreorderCampaign,
  PreorderCampaignStatus,
  type PreorderDepositType,
} from "@/domain/entities/PreorderCampaign";
import type { PreorderRepository } from "@/domain/repositories/PreorderRepository";
import { ApplicationError } from "@/application/errors/ApplicationError";
import { PreorderMapper } from "@/application/dto/preorder.mapper";
import type { PreorderCampaignDTO } from "@/application/dto/preorder.dto";

export interface UpdatePreorderCampaignInput {
  id: string;
  status?: PreorderCampaignStatus;
  totalSlots?: number;
  depositType?: PreorderDepositType;
  depositValue?: number;
  allowFullPayment?: boolean;
  opensAt?: Date | null;
  closesAt?: Date | null;
  releaseDate?: Date | null;
  etaStart?: Date | null;
  etaEnd?: Date | null;
  etaLabel?: string | null;
  terms?: string | null;
  arrivalNotes?: string | null;
  allowReservedSlotReduction?: boolean;
  deletedAt?: Date | null;
}

export class UpdatePreorderCampaign {
  constructor(private readonly preorderRepository: PreorderRepository) {}

  async execute(input: UpdatePreorderCampaignInput): Promise<PreorderCampaignDTO> {
    const current = await this.preorderRepository.findCampaignById(input.id);
    if (!current) throw ApplicationError.invalidPreorderState("Preorder not found");

    const totalSlots = input.totalSlots ?? current.totalSlots;
    if (
      totalSlots < current.reservedUnits &&
      input.allowReservedSlotReduction !== true
    ) {
      throw ApplicationError.limitExceeded(
        "totalSlots cannot be lower than reservedUnits",
      );
    }

    if (
      current.reservedUnits > 0 &&
      ((input.depositType !== undefined &&
        input.depositType !== current.depositType) ||
        (input.depositValue !== undefined &&
          input.depositValue !== current.depositValue))
    ) {
      throw ApplicationError.invalidPreorderState(
        "Deposit rules cannot be changed after reservations exist",
      );
    }

    const updated = PreorderCampaign.create({
      id: current.id,
      productId: current.productId,
      status: input.status ?? current.status,
      totalSlots,
      reservedUnits: current.reservedUnits,
      depositType: input.depositType ?? current.depositType,
      depositValue: input.depositValue ?? current.depositValue,
      allowFullPayment: input.allowFullPayment ?? current.allowFullPayment,
      opensAt: input.opensAt !== undefined ? input.opensAt : current.opensAt,
      closesAt:
        input.closesAt !== undefined ? input.closesAt : current.closesAt,
      releaseDate:
        input.releaseDate !== undefined ? input.releaseDate : current.releaseDate,
      etaStart: input.etaStart !== undefined ? input.etaStart : current.etaStart,
      etaEnd: input.etaEnd !== undefined ? input.etaEnd : current.etaEnd,
      etaLabel: input.etaLabel !== undefined ? input.etaLabel : current.etaLabel,
      terms: input.terms !== undefined ? input.terms : current.terms,
      arrivalNotes:
        input.arrivalNotes !== undefined
          ? input.arrivalNotes
          : current.arrivalNotes,
      createdAt: current.createdAt,
      updatedAt: current.updatedAt,
      deletedAt: input.deletedAt !== undefined ? input.deletedAt : current.deletedAt,
    });

    const saved = await this.preorderRepository.updateCampaign({ campaign: updated });
    return PreorderMapper.campaignToDTO(saved);
  }
}
