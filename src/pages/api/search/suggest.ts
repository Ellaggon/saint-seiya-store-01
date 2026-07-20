import type { APIRoute } from "astro";
import { Prisma } from "@prisma/client";
import { failure, success } from "@/endpoints/api/shared/api-response";
import { prisma } from "@/infrastructure/database/prisma";

const SUGGEST_LIMIT_PER_SOURCE = 6;
const MIN_QUERY_LENGTH = 2;
const CACHE_TTL_MS = 20_000;
const CACHE_MAX_ENTRIES = 80;

type SearchSource = "catalog" | "preorder";

export interface SearchSuggestItem {
  id: string;
  name: string;
  source: SearchSource;
  href: string;
}

export interface SearchSuggestResponse {
  query: string;
  items: SearchSuggestItem[];
}

type SuggestRow = {
  id: string;
  name: string;
  source: SearchSource;
};

type CacheEntry = {
  expires: number;
  value: SearchSuggestResponse;
};

const suggestCache = new Map<string, CacheEntry>();

const remember = (key: string, value: SearchSuggestResponse) => {
  suggestCache.delete(key);
  suggestCache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
  if (suggestCache.size > CACHE_MAX_ENTRIES) {
    const oldest = suggestCache.keys().next().value;
    if (oldest) suggestCache.delete(oldest);
  }
};

const getCached = (key: string): SearchSuggestResponse | null => {
  const entry = suggestCache.get(key);
  if (!entry) return null;
  if (entry.expires <= Date.now()) {
    suggestCache.delete(key);
    return null;
  }
  suggestCache.delete(key);
  suggestCache.set(key, entry);
  return entry.value;
};

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const query = (url.searchParams.get("q") || "").trim();
    const cacheKey = query.toLocaleLowerCase("es");

    if (query.length < MIN_QUERY_LENGTH) {
      return success<SearchSuggestResponse>(
        { query, items: [] },
        {
          headers: {
            "Cache-Control": "public, max-age=15, stale-while-revalidate=30",
          },
        },
      );
    }

    const cached = getCached(cacheKey);
    if (cached) {
      return success(cached, {
        headers: {
          "Cache-Control": "public, max-age=15, stale-while-revalidate=30",
          "X-Search-Cache": "HIT",
        },
      });
    }

    const pattern = `%${query}%`;
    const prefixPattern = `${query}%`;
    const limit = Prisma.raw(String(SUGGEST_LIMIT_PER_SOURCE));

    const rows = await prisma.$queryRaw<SuggestRow[]>`
      (
        SELECT p.id, p.name, 'catalog'::text AS source
        FROM "Product" p
        WHERE p."deletedAt" IS NULL
          AND p.status = 'PUBLISHED'::"ProductStatus"
          AND p.name ILIKE ${pattern}
        ORDER BY
          CASE WHEN p.name ILIKE ${prefixPattern} THEN 0 ELSE 1 END,
          p.name ASC
        LIMIT ${limit}
      )
      UNION ALL
      (
        SELECT p.id, p.name, 'preorder'::text AS source
        FROM "Product" p
        WHERE p."deletedAt" IS NULL
          AND p.status = 'PRE_ORDER'::"ProductStatus"
          AND p.name ILIKE ${pattern}
          AND EXISTS (
            SELECT 1
            FROM "PreorderCampaign" c
            WHERE c."productId" = p.id
              AND c."deletedAt" IS NULL
              AND c.status IN (
                'ACTIVE'::"PreorderCampaignStatus",
                'SOLD_OUT'::"PreorderCampaignStatus"
              )
          )
        ORDER BY
          CASE WHEN p.name ILIKE ${prefixPattern} THEN 0 ELSE 1 END,
          p.name ASC
        LIMIT ${limit}
      )
    `;

    const payload: SearchSuggestResponse = {
      query,
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        source: row.source,
        href: `/product/${row.id}`,
      })),
    };

    remember(cacheKey, payload);

    return success(payload, {
      headers: {
        "Cache-Control": "public, max-age=15, stale-while-revalidate=30",
        "X-Search-Cache": "MISS",
      },
    });
  } catch (error: unknown) {
    return failure(error);
  }
};
