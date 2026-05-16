import {
  PreorderCampaignStatus,
  PreorderDepositType,
} from "@/domain/entities/PreorderCampaign";
import { PreorderPaymentKind } from "@/domain/entities/PreorderPayment";
import type {
  PreorderAvailabilityFilter,
  PreorderSort,
} from "@/domain/repositories/PreorderRepository";

import { ApplicationError } from "./api-errors";
import { parsePagination } from "./pagination";

export type JsonObject = Record<string, unknown>;

const preorderSorts: PreorderSort[] = [
  "created-desc",
  "eta-asc",
  "price-asc",
  "price-desc",
];

const availabilityFilters: PreorderAvailabilityFilter[] = [
  "AVAILABLE",
  "SOLD_OUT",
  "OPEN",
];

const campaignStatuses = Object.values(PreorderCampaignStatus);
const depositTypes = Object.values(PreorderDepositType);
const paymentKinds = Object.values(PreorderPaymentKind);

export const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const optionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;

export const optionalNullableString = (
  value: unknown,
): string | null | undefined => {
  if (value === null) return null;
  return optionalString(value);
};

export const requiredString = (body: JsonObject, key: string): string => {
  const value = optionalString(body[key]);
  if (!value) throw ApplicationError.validation(`${key} is required`);
  return value;
};

export const optionalNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const requiredPositiveInt = (body: JsonObject, key: string): number => {
  const value = optionalNumber(body[key]);
  if (value === undefined || !Number.isInteger(value) || value <= 0) {
    throw ApplicationError.validation(`${key} must be a positive integer`);
  }
  return value;
};

export const requiredNonNegativeNumber = (
  body: JsonObject,
  key: string,
): number => {
  const value = optionalNumber(body[key]);
  if (value === undefined || value < 0) {
    throw ApplicationError.validation(`${key} must be a non-negative number`);
  }
  return value;
};

export const optionalBoolean = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined;

export const optionalDate = (value: unknown): Date | null | undefined => {
  if (value === null) return null;
  const text = optionalString(value);
  if (!text) return undefined;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    throw ApplicationError.validation("Invalid date value");
  }
  return date;
};

export const parseJsonBody = async (request: Request): Promise<JsonObject> => {
  const body: unknown = await request.json().catch(() => null);
  if (!isJsonObject(body)) {
    throw ApplicationError.validation("Request body must be a JSON object");
  }
  return body;
};

export const parsePreorderStatus = (
  value: string | null,
): PreorderCampaignStatus | undefined => {
  if (!value) return undefined;
  if (!campaignStatuses.includes(value as PreorderCampaignStatus)) {
    throw ApplicationError.validation("Invalid preorder status");
  }
  return value as PreorderCampaignStatus;
};

export const parsePublicPreorderStatus = (
  value: string | null,
): PreorderCampaignStatus | undefined => {
  const status = parsePreorderStatus(value);
  if (
    status &&
    status !== PreorderCampaignStatus.ACTIVE &&
    status !== PreorderCampaignStatus.SOLD_OUT
  ) {
    throw ApplicationError.forbidden();
  }
  return status;
};

export const parseDepositType = (value: unknown): PreorderDepositType => {
  const text = optionalString(value);
  if (!text || !depositTypes.includes(text as PreorderDepositType)) {
    throw ApplicationError.validation("Invalid preorder deposit type");
  }
  return text as PreorderDepositType;
};

export const parsePreorderPaymentKind = (
  value: unknown,
): PreorderPaymentKind => {
  const text = optionalString(value);
  if (!text || !paymentKinds.includes(text as PreorderPaymentKind)) {
    throw ApplicationError.validation("Invalid preorder payment kind");
  }
  return text as PreorderPaymentKind;
};

export const parsePreorderSort = (
  value: string | null,
): PreorderSort | undefined => {
  if (!value) return undefined;
  if (!preorderSorts.includes(value as PreorderSort)) {
    throw ApplicationError.validation("Invalid preorder sort");
  }
  return value as PreorderSort;
};

export const parseAvailability = (
  value: string | null,
): PreorderAvailabilityFilter | undefined => {
  if (!value) return undefined;
  if (!availabilityFilters.includes(value as PreorderAvailabilityFilter)) {
    throw ApplicationError.validation("Invalid preorder availability filter");
  }
  return value as PreorderAvailabilityFilter;
};

export const parsePreorderListQuery = (
  params: URLSearchParams,
  scope: "public" | "admin",
) => ({
  status:
    scope === "public"
      ? parsePublicPreorderStatus(params.get("status"))
      : parsePreorderStatus(params.get("status")),
  category: params.get("category") || undefined,
  collection: params.get("collection") || undefined,
  character: params.get("character") || undefined,
  availability: parseAvailability(params.get("availability")),
  etaFrom: optionalDate(params.get("etaFrom")) ?? undefined,
  etaTo: optionalDate(params.get("etaTo")) ?? undefined,
  minPrice: optionalNumber(params.get("minPrice")),
  maxPrice: optionalNumber(params.get("maxPrice")),
  sort: parsePreorderSort(params.get("sort")),
  ...parsePagination(params),
});
