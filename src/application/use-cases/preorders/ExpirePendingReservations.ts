import { ApplicationError } from "@/application/errors/ApplicationError";
import type { PreorderRepository } from "@/domain/repositories/PreorderRepository";

export interface ExpirePendingReservationsInput {
  now: Date;
  campaignId?: string;
  batchSize?: number;
}

export interface ExpirePendingReservationsResult {
  expiredCount: number;
  now: string;
  campaignId: string | null;
  batchSize: number | null;
}

export class ExpirePendingReservations {
  constructor(private readonly preorderRepository: PreorderRepository) {}

  async execute(
    input: ExpirePendingReservationsInput,
  ): Promise<ExpirePendingReservationsResult> {
    try {
      this.assertValidInput(input);

      const result = await this.preorderRepository.expirePendingReservations({
        now: input.now,
        campaignId: input.campaignId,
        batchSize: input.batchSize,
      });

      return {
        expiredCount: result.expiredCount,
        now: input.now.toISOString(),
        campaignId: input.campaignId ?? null,
        batchSize: input.batchSize ?? null,
      };
    } catch (error) {
      throw ApplicationError.normalizeUnknownError(error);
    }
  }

  private assertValidInput(input: ExpirePendingReservationsInput): void {
    if (!(input.now instanceof Date) || Number.isNaN(input.now.getTime())) {
      throw ApplicationError.validation("Expiration date must be a valid Date");
    }

    if (input.batchSize !== undefined) {
      if (!Number.isFinite(input.batchSize) || input.batchSize <= 0) {
        throw ApplicationError.validation(
          "Expiration batch size must be greater than zero",
        );
      }
    }
  }
}
