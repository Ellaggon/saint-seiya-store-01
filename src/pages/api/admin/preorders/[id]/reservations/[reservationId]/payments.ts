import type { APIRoute } from "astro";

import { createRegisterManualPreorderPaymentUseCase } from "@/infrastructure/preorders/PreorderUseCaseFactory";
import { ApplicationError } from "@/endpoints/api/shared/api-errors";
import { failure, success } from "@/endpoints/api/shared/api-response";
import { requireAdmin } from "@/endpoints/api/shared/auth";
import {
  optionalDate,
  optionalString,
  parseJsonBody,
  parsePreorderPaymentKind,
  requiredNonNegativeNumber,
} from "@/endpoints/api/shared/query";

export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    requireAdmin(locals);
    const reservationId = params.reservationId;
    if (!reservationId) {
      throw ApplicationError.validation("Reservation id is required");
    }

    const body = await parseJsonBody(request);
    const useCase = createRegisterManualPreorderPaymentUseCase();
    const data = await useCase.execute({
      reservationId,
      kind: parsePreorderPaymentKind(body.kind),
      amount: requiredNonNegativeNumber(body, "amount"),
      idempotencyKey: optionalString(body.idempotencyKey),
      paidAt: optionalDate(body.paidAt),
      now: new Date(),
    });

    return success(data, { status: 201 });
  } catch (error) {
    return failure(error);
  }
};
