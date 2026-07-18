import type { APIRoute } from "astro";

import { createCancelReservationUseCase } from "@/infrastructure/preorders/PreorderUseCaseFactory";
import { invalidateCatalogCache } from "@/application/services/CatalogQueryService";
import { ApplicationError } from "@/endpoints/api/shared/api-errors";
import { failure, success } from "@/endpoints/api/shared/api-response";
import { requireAdmin } from "@/endpoints/api/shared/auth";

export const POST: APIRoute = async ({ params, locals }) => {
  try {
    requireAdmin(locals);
    const reservationId = params.reservationId;
    if (!reservationId) {
      throw ApplicationError.validation("Reservation id is required");
    }

    const useCase = createCancelReservationUseCase();
    const data = await useCase.execute({
      reservationId,
      actorRole: "ADMIN",
    });

    invalidateCatalogCache();
    return success(data);
  } catch (error) {
    return failure(error);
  }
};
