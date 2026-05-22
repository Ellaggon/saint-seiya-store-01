import type { APIRoute } from "astro";

import { createExpirePendingReservationsUseCase } from "@/infrastructure/preorders/PreorderUseCaseFactory";
import { failure, success } from "@/endpoints/api/shared/api-response";
import { ApplicationError } from "@/application/errors/ApplicationError";

const authorizeCron = (request: Request): void => {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    throw ApplicationError.unauthorized();
  }
};

export const GET: APIRoute = async ({ request }) => {
  const startedAt = Date.now();

  try {
    authorizeCron(request);

    const useCase = createExpirePendingReservationsUseCase();
    const result = await useCase.execute({
      now: new Date(),
      batchSize: 500,
    });
    const durationMs = Date.now() - startedAt;

    console.info("[preorders:expire-pending]", {
      expiredCount: result.expiredCount,
      durationMs,
    });

    return success({
      ...result,
      durationMs,
    });
  } catch (error) {
    if (!(error instanceof ApplicationError && error.code === "UNAUTHORIZED")) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      console.error("[preorders:expire-pending:error]", { message });
    }
    return failure(error);
  }
};
