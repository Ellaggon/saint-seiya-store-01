import type { APIRoute } from "astro";
import { getProducts } from "@/endpoints/api/products/getProducts";

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

    return new Response(JSON.stringify(products), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
