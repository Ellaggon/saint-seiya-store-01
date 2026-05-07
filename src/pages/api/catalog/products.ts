import type { APIRoute } from "astro";
import { CatalogQueryService } from "../../../application/services/CatalogQueryService";
import { GetCatalogProductsUseCase } from "../../../application/use-cases/catalog/GetCatalogProductsUseCase";
import type { CatalogSort } from "@/domain/repositories/ProductRepository";

const resolveSort = (sort?: string): CatalogSort | undefined => {
  const allowed: CatalogSort[] = [
    "created-desc",
    "price-asc",
    "price-desc",
    "name-asc",
  ];
  if (!sort) return undefined;
  return allowed.includes(sort as CatalogSort)
    ? (sort as CatalogSort)
    : undefined;
};

export const GET: APIRoute = async ({ request }) => {
  const start = performance.now();
  console.time("catalog_products_api");
  try {
    const url = new URL(request.url);
    const params = url.searchParams;

    const filters = {
      category: params.get("category") || undefined,
      collection: params.get("collection") || undefined,
      character: params.get("character") || undefined,
      status: params.get("status") || undefined,
      sort: resolveSort(params.get("sort") || undefined),
      page: params.get("page") ? Number(params.get("page")) : undefined,
      pageSize: params.get("pageSize")
        ? Number(params.get("pageSize"))
        : undefined,
    };

    const queryService = new CatalogQueryService();
    const useCase = new GetCatalogProductsUseCase(queryService);

    const data = await useCase.execute(filters);

    console.timeEnd("catalog_products_api");
    const duration = performance.now() - start;
    console.log(`[API /catalog/products] Total duration: ${duration.toFixed(2)}ms`);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
      },
    });
  } catch (error: any) {
    console.timeEnd("catalog_products_api");
    console.error("[Catalog Products API Error]:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
};
