import type { APIRoute } from "astro";
import { CatalogQueryService } from "../../../application/services/CatalogQueryService";
import { GetCatalogMetadataUseCase } from "../../../application/use-cases/catalog/GetCatalogMetadataUseCase";
import { legacyFailure, legacySuccess } from "@/endpoints/api/shared/api-response";
import { PrismaCatalogQueryRepository } from "@/infrastructure/database/PrismaCatalogQueryRepository";

export const GET: APIRoute = async () => {
  try {
    const queryService = new CatalogQueryService(
      new PrismaCatalogQueryRepository(),
    );
    const useCase = new GetCatalogMetadataUseCase(queryService);

    const data = await useCase.execute();

    // Legacy response shape: raw catalog metadata.
    // Keep this unwrapped until all consumers are migrated to { data }.
    return legacySuccess(data, {
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    });
  } catch (error: unknown) {
    return legacyFailure(error);
  }
};
