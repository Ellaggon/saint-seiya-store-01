import type { APIRoute } from "astro";

import { GetPreorderDetail } from "@/application/use-cases/preorders";
import { PreorderCampaignStatus } from "@/domain/entities/PreorderCampaign";
import { createGetPreorderDetailUseCase } from "@/infrastructure/preorders/PreorderUseCaseFactory";
import { ApplicationError } from "@/endpoints/api/shared/api-errors";
import { failure, success } from "@/endpoints/api/shared/api-response";

const publicStatuses = new Set<PreorderCampaignStatus>([
  PreorderCampaignStatus.ACTIVE,
  PreorderCampaignStatus.SOLD_OUT,
]);

export const GET: APIRoute = async ({ params, url }) => {
  try {
    const idOrSlug = params.id;
    if (!idOrSlug) throw ApplicationError.validation("Preorder id is required");

    const useCase = createGetPreorderDetailUseCase();
    const quantity = url.searchParams.get("quantity")
      ? Number(url.searchParams.get("quantity"))
      : undefined;
    const payInFull = url.searchParams.get("payInFull") === "true";

    const data = await resolveDetail(useCase, idOrSlug, quantity, payInFull);

    if (!publicStatuses.has(data.campaign.status)) {
      throw ApplicationError.forbidden();
    }

    return success(data, {
      headers: {
        "Cache-Control": "public, s-maxage=60",
      },
    });
  } catch (error) {
    return failure(error);
  }
};

const resolveDetail = async (
  useCase: GetPreorderDetail,
  idOrSlug: string,
  quantity: number | undefined,
  payInFull: boolean,
) => {
  try {
    return await useCase.execute({ id: idOrSlug, quantity, payInFull });
  } catch (error) {
    const appError = ApplicationError.normalizeUnknownError(error);
    if (appError.code !== "INVALID_PREORDER_STATE") throw appError;
    return useCase.execute({ productSlug: idOrSlug, quantity, payInFull });
  }
};
