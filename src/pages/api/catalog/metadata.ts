import type { APIRoute } from "astro";
import { CatalogQueryService } from "../../../application/services/CatalogQueryService";
import { GetCatalogMetadataUseCase } from "../../../application/use-cases/catalog/GetCatalogMetadataUseCase";

export const GET: APIRoute = async () => {
  const start = performance.now();
  console.time("catalog_metadata_api");
  try {
    const queryService = new CatalogQueryService();
    const useCase = new GetCatalogMetadataUseCase(queryService);

    const data = await useCase.execute();

    console.timeEnd("catalog_metadata_api");
    const duration = performance.now() - start;
    console.log(`[API /catalog/metadata] Total duration: ${duration.toFixed(2)}ms`);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
      },
    });
  } catch (error: any) {
    console.timeEnd("catalog_metadata_api");
    console.error("[Catalog Metadata API Error]:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
};
