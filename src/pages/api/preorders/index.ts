import type { APIRoute } from "astro";

import { PreorderCampaignStatus } from "@/domain/entities/PreorderCampaign";
import { createListPreordersUseCase } from "@/infrastructure/preorders/PreorderUseCaseFactory";
import { failure, success } from "@/endpoints/api/shared/api-response";
import { parsePreorderListQuery } from "@/endpoints/api/shared/query";

export const GET: APIRoute = async ({ url }) => {
  try {
    const filters = parsePreorderListQuery(url.searchParams, "public");
    const useCase = createListPreordersUseCase();
    const data = await useCase.execute({
      ...filters,
      status: filters.status ?? PreorderCampaignStatus.ACTIVE,
    });

    return success(data, {
      headers: {
        "Cache-Control": "public, s-maxage=60",
      },
    });
  } catch (error) {
    return failure(error);
  }
};
