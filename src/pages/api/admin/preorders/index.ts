import type { APIRoute } from "astro";

import {
  createCreatePreorderCampaignUseCase,
  createListPreordersUseCase,
} from "@/infrastructure/preorders/PreorderUseCaseFactory";
import { failure, success } from "@/endpoints/api/shared/api-response";
import { requireAdmin } from "@/endpoints/api/shared/auth";
import {
  optionalBoolean,
  optionalDate,
  optionalNullableString,
  parseDepositType,
  parseJsonBody,
  parsePreorderListQuery,
  requiredNonNegativeNumber,
  requiredPositiveInt,
  requiredString,
} from "@/endpoints/api/shared/query";

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    requireAdmin(locals);
    const useCase = createListPreordersUseCase();
    const data = await useCase.execute(parsePreorderListQuery(url.searchParams, "admin"));
    return success(data);
  } catch (error) {
    return failure(error);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    requireAdmin(locals);
    const body = await parseJsonBody(request);
    const useCase = createCreatePreorderCampaignUseCase();

    const data = await useCase.execute({
      productId: requiredString(body, "productId"),
      totalSlots: requiredPositiveInt(body, "totalSlots"),
      depositType: parseDepositType(body.depositType),
      depositValue: requiredNonNegativeNumber(body, "depositValue"),
      allowFullPayment: optionalBoolean(body.allowFullPayment),
      opensAt: optionalDate(body.opensAt),
      closesAt: optionalDate(body.closesAt),
      releaseDate: optionalDate(body.releaseDate),
      etaStart: optionalDate(body.etaStart),
      etaEnd: optionalDate(body.etaEnd),
      etaLabel: optionalNullableString(body.etaLabel),
      terms: optionalNullableString(body.terms),
      arrivalNotes: optionalNullableString(body.arrivalNotes),
      now: new Date(),
    });

    return success(data, { status: 201 });
  } catch (error) {
    return failure(error);
  }
};
