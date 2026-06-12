import type {
  CatalogSort,
  ProductFilters,
} from "@/domain/repositories/ProductRepository";
import { parsePageParams } from "./pagination";
import { resolveSort } from "./sorting";

export const catalogSorts = [
  "created-desc",
  "price-asc",
  "price-desc",
  "name-asc",
  "eta-asc",
] as const satisfies readonly CatalogSort[];

const toPositiveMoney = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return parsed;
};

export const parseCatalogFilters = (
  params: URLSearchParams,
  pageDefaults?: Parameters<typeof parsePageParams>[1],
): ProductFilters => ({
  q: params.get("q")?.trim() || undefined,
  category: params.get("category") || undefined,
  collection: params.get("collection") || undefined,
  availability: params.get("availability") || undefined,
  status: params.get("status") || undefined,
  minPrice: toPositiveMoney(params.get("minPrice")),
  maxPrice: toPositiveMoney(params.get("maxPrice")),
  showSoldOut: params.get("showSoldOut") === "true",
  openPreorders: params.get("openPreorders") === "true",
  sort: resolveSort(params.get("sort"), catalogSorts, "created-desc"),
  ...parsePageParams(params, pageDefaults),
});
