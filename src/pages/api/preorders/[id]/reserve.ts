import type { APIRoute } from "astro";

import { createReservePreorderUseCase } from "@/infrastructure/preorders/PreorderUseCaseFactory";
import { failure, success } from "@/endpoints/api/shared/api-response";
import { requireUser } from "@/endpoints/api/shared/auth";
import {
  parseJsonBody,
  requiredPositiveInt,
  requiredString,
} from "@/endpoints/api/shared/query";
import { ApplicationError } from "@/endpoints/api/shared/api-errors";

export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    const user = requireUser(locals);
    const preorderId = params.id;
    if (!preorderId) throw ApplicationError.validation("Preorder id is required");

    const body = await parseJsonBody(request);
    const quantity = requiredPositiveInt(body, "quantity");
    const paymentMode = requiredString(body, "paymentMode");

    const useCase = createReservePreorderUseCase();
    const data = await useCase.execute({
      preorderId,
      userId: user.id,
      quantity,
      paymentMode,
      now: new Date(),
    });

    return success(data, { status: 201 });
  } catch (error) {
    return failure(error);
  }
};
