import {
  PreorderPaymentKind,
  PreorderPaymentProvider,
  PreorderPaymentStatus,
} from "@/domain/entities/PreorderPayment";
import type { PreorderRepository } from "@/domain/repositories/PreorderRepository";
import { Money } from "@/domain/value-objects/Money";
import { ApplicationError } from "@/application/errors/ApplicationError";
import { PreorderMapper } from "@/application/dto/preorder.mapper";
import type { PreorderPaymentDTO } from "@/application/dto/preorder.dto";

export interface RegisterManualPreorderPaymentInput {
  reservationId: string;
  kind: PreorderPaymentKind;
  amount: number;
  idempotencyKey?: string | null;
  paidAt?: Date | null;
  now: Date;
}

export class RegisterManualPreorderPayment {
  constructor(private readonly preorderRepository: PreorderRepository) {}

  async execute(
    input: RegisterManualPreorderPaymentInput,
  ): Promise<PreorderPaymentDTO> {
    try {
      const reservation = await this.preorderRepository.findReservationById(
        input.reservationId,
      );
      if (!reservation) {
        throw ApplicationError.reservationNotFound(input.reservationId);
      }

      const amount = Money.from(input.amount);
      if (amount.equals(Money.zero())) {
        throw ApplicationError.invalidPaymentAmount(
          "Manual payment amount must be greater than zero",
        );
      }

      const balanceDue = reservation.totalAmount.subtract(reservation.paidAmount);
      if (amount.greaterThan(balanceDue)) {
        throw ApplicationError.paymentExceedsBalance();
      }

      const payment = await this.preorderRepository.registerPayment({
        reservationId: input.reservationId,
        kind: input.kind,
        amount,
        status: PreorderPaymentStatus.PAID,
        provider: PreorderPaymentProvider.MANUAL,
        providerPaymentId: input.idempotencyKey ?? null,
        paidAt: input.paidAt ?? input.now,
        createdAt: input.now,
      });

      return PreorderMapper.paymentToDTO(payment);
    } catch (error) {
      throw ApplicationError.normalizeUnknownError(error);
    }
  }
}
