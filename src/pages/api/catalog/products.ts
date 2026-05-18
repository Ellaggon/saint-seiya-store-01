import type { APIRoute } from "astro";
import { CatalogQueryService } from "../../../application/services/CatalogQueryService";
import { GetCatalogProductsUseCase } from "../../../application/use-cases/catalog/GetCatalogProductsUseCase";
import type { CatalogSort } from "@/domain/repositories/ProductRepository";
import { legacyFailure, legacySuccess } from "@/endpoints/api/shared/api-response";
import { PrismaCatalogQueryRepository } from "@/infrastructure/database/PrismaCatalogQueryRepository";
import { parsePageParams } from "@/shared/listing/pagination";
import { resolveSort } from "@/shared/listing/sorting";

const catalogSorts: CatalogSort[] = [
  "created-desc",
  "price-asc",
  "price-desc",
  "name-asc",
];

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const params = url.searchParams;

    const filters = {
      category: params.get("category") || undefined,
      collection: params.get("collection") || undefined,
      character: params.get("character") || undefined,
      status: params.get("status") || undefined,
      sort: resolveSort(params.get("sort"), catalogSorts),
      ...parsePageParams(params),
    };

    const queryService = new CatalogQueryService(
      new PrismaCatalogQueryRepository(),
    );
    const useCase = new GetCatalogProductsUseCase(queryService);

    const data = await useCase.execute(filters);

    // Legacy response shape: raw CatalogProductsResponseDTO.
    // Keep this unwrapped until all consumers are migrated to { data }.
    return legacySuccess(data, {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
      },
    });
  } catch (error: unknown) {
    return legacyFailure(error);
  }
};
