import type { APIRoute } from "astro";
import { getProducts } from "@/endpoints/api/products/getProducts";
import { legacyFailure, legacySuccess } from "@/endpoints/api/shared/api-response";

export const GET: APIRoute = async ({ url }) => {
  try {
    const params = url.searchParams;
    const filters = {
      category: params.get("category") || undefined,
      collection: params.get("collection") || undefined,
      character: params.get("character") || undefined,
      status: params.get("status") || undefined,
    };

    const products = await getProducts(filters);

    // Legacy response shape: raw ProductDTO[].
    // Admin preorder product picker currently consumes this shape directly.
    return legacySuccess(products, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error: unknown) {
    return legacyFailure(error);
  }
};
