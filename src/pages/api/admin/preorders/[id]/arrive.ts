import type { APIRoute } from "astro";

import { createMarkArrivedUseCase } from "@/infrastructure/preorders/PreorderUseCaseFactory";
import { ApplicationError } from "@/endpoints/api/shared/api-errors";
import { failure, success } from "@/endpoints/api/shared/api-response";
import { requireAdmin } from "@/endpoints/api/shared/auth";

export const POST: APIRoute = async ({ params, locals }) => {
  try {
    requireAdmin(locals);
    const preorderId = params.id;
    if (!preorderId) throw ApplicationError.validation("Preorder id is required");

    const useCase = createMarkArrivedUseCase();
    const data = await useCase.execute({ preorderId });
    return success(data);
  } catch (error) {
    return failure(error);
  }
};
