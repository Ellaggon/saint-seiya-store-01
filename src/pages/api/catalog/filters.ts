import type { APIRoute } from "astro";
import { getFilters } from "@/endpoints/api/catalog/getFilters";
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

    const data = await getFilters(filters);

    // Legacy response shape: raw catalog filter metadata.
    // Keep this unwrapped until all consumers are migrated to { data }.
    return legacySuccess(data, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error: unknown) {
    return legacyFailure(error);
  }
};
