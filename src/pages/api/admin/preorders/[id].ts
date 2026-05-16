import type { APIRoute } from "astro";

import { PreorderCampaignStatus } from "@/domain/entities/PreorderCampaign";
import {
  createGetPreorderDetailUseCase,
  createUpdatePreorderCampaignUseCase,
} from "@/infrastructure/preorders/PreorderUseCaseFactory";
import { ApplicationError } from "@/endpoints/api/shared/api-errors";
import { failure, success } from "@/endpoints/api/shared/api-response";
import { requireAdmin } from "@/endpoints/api/shared/auth";
import {
  optionalBoolean,
  optionalDate,
  optionalNullableString,
  optionalNumber,
  parseDepositType,
  parseJsonBody,
  parsePreorderStatus,
} from "@/endpoints/api/shared/query";

export const GET: APIRoute = async ({ params, locals }) => {
  try {
    requireAdmin(locals);
    const id = params.id;
    if (!id) throw ApplicationError.validation("Preorder id is required");

    const useCase = createGetPreorderDetailUseCase();
    const data = await useCase.execute({ id });
    return success(data);
  } catch (error) {
    return failure(error);
  }
};

export const PUT: APIRoute = async ({ params, request, locals }) => {
  try {
    requireAdmin(locals);
    const id = params.id;
    if (!id) throw ApplicationError.validation("Preorder id is required");

    const body = await parseJsonBody(request);
    const useCase = createUpdatePreorderCampaignUseCase();

    const data = await useCase.execute({
      id,
      status: parsePreorderStatus(optionalNullableString(body.status) ?? null),
      totalSlots: optionalNumber(body.totalSlots),
      depositType:
        body.depositType !== undefined ? parseDepositType(body.depositType) : undefined,
      depositValue: optionalNumber(body.depositValue),
      allowFullPayment: optionalBoolean(body.allowFullPayment),
      opensAt: optionalDate(body.opensAt),
      closesAt: optionalDate(body.closesAt),
      releaseDate: optionalDate(body.releaseDate),
      etaStart: optionalDate(body.etaStart),
      etaEnd: optionalDate(body.etaEnd),
      etaLabel: optionalNullableString(body.etaLabel),
      terms: optionalNullableString(body.terms),
      arrivalNotes: optionalNullableString(body.arrivalNotes),
    });

    return success(data);
  } catch (error) {
    return failure(error);
  }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    requireAdmin(locals);
    const id = params.id;
    if (!id) throw ApplicationError.validation("Preorder id is required");

    const useCase = createUpdatePreorderCampaignUseCase();
    const data = await useCase.execute({
      id,
      status: PreorderCampaignStatus.CANCELED,
      deletedAt: new Date(),
    });

    return success(data);
  } catch (error) {
    return failure(error);
  }
};
