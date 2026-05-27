import {
  PreorderPaymentKind,
  PreorderPaymentProvider,
  PreorderPaymentStatus,
} from "@/domain/entities/PreorderPayment";
import { PreorderReservationStatus } from "@/domain/entities/PreorderReservation";
import type { PreorderRepository } from "@/domain/repositories/PreorderRepository";
import { ApplicationError } from "@/application/errors/ApplicationError";
import { PreorderMapper } from "@/application/dto/preorder.mapper";
import type { PreorderPaymentDTO } from "@/application/dto/preorder.dto";
import { Money } from "@/domain/value-objects/Money";
import {
  assertExactBalancePayment,
  assertPositivePaymentAmount,
  calculateReservationBalance,
} from "@/application/services/PreorderPaymentPolicy";

export interface CompleteBalancePaymentInput {
  reservationId: string;
  amount: number;
  provider?: PreorderPaymentProvider | null;
  providerPaymentId?: string | null;
  paidAt?: Date | null;
  now: Date;
}

export class CompleteBalancePayment {
  constructor(private readonly preorderRepository: PreorderRepository) {}

  async execute(input: CompleteBalancePaymentInput): Promise<PreorderPaymentDTO> {
    try {
      const reservation = await this.preorderRepository.findReservationById(
        input.reservationId,
      );
      if (!reservation) {
        throw ApplicationError.reservationNotFound(input.reservationId);
      }

      if (reservation.status !== PreorderReservationStatus.CONFIRMED) {
        throw ApplicationError.invalidReservationState(
          "Balance payment requires a confirmed preorder reservation",
        );
      }

      const amount = Money.from(input.amount);
      const balanceDue = calculateReservationBalance(reservation);
      assertPositivePaymentAmount(amount);
      assertExactBalancePayment(amount, balanceDue);

      const payment = await this.preorderRepository.registerPayment({
        reservationId: input.reservationId,
        kind: PreorderPaymentKind.BALANCE,
        amount: balanceDue,
        status: PreorderPaymentStatus.PAID,
        provider: input.provider,
        providerPaymentId: input.providerPaymentId,
        paidAt: input.paidAt ?? input.now,
        createdAt: input.now,
      });

      return PreorderMapper.paymentToDTO(payment);
    } catch (error) {
      throw ApplicationError.normalizeUnknownError(error);
    }
  }
}
