import type { APIRoute } from "astro";
import { CatalogQueryService } from "../../../application/services/CatalogQueryService";
import { GetCatalogProductsUseCase } from "../../../application/use-cases/catalog/GetCatalogProductsUseCase";
import { legacyFailure, legacySuccess } from "@/endpoints/api/shared/api-response";
import { PrismaCatalogQueryRepository } from "@/infrastructure/database/PrismaCatalogQueryRepository";
import { parseCatalogFilters } from "@/shared/listing/catalogQuery";

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const params = url.searchParams;

    const filters = parseCatalogFilters(params);

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
