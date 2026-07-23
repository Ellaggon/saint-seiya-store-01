import type { CollectionDTO } from "@/application/dto/catalog.dto";
import type {
  PaginatedResultDTO,
  PreorderDetailDTO,
  PreorderListItemDTO,
  PreorderReservationDTO,
} from "@/application/dto/preorder.dto";
import type {
  AdminProductData,
  CategoryData,
} from "@/domain/repositories/ProductRepository";
import type { ListPreordersInput } from "@/application/use-cases/preorders/ListPreorders";

/**
 * Admin read-through cache (process memory).
 *
 * Strategy:
 * - Short TTL (45s lists / 30s details) — fresher than public storefront caches.
 * - Isolated from catalog/preorder public caches (DRAFT/PAUSED stay admin-only).
 * - In-flight dedupe for prefetch + double navigation.
 * - Skip free-text search and uncommon filter shapes.
 * - Invalidate on every admin/store mutation that touches products or campaigns.
 */

interface CacheEntry<T> {
  value: T;
  expires: number;
}

export interface AdminProductFormOptions {
  categories: CategoryData[];
  collections: CollectionDTO[];
}

const LIST_TTL_MS = 45_000;
const DETAIL_TTL_MS = 30_000;
const FORM_OPTIONS_TTL_MS = 60_000;
const LIST_CACHE_LIMIT = 40;
const DETAIL_CACHE_LIMIT = 60;

type PreorderListResult = PaginatedResultDTO<PreorderListItemDTO>;

const preorderListCache = new Map<string, CacheEntry<PreorderListResult>>();
const preorderListInFlight = new Map<string, Promise<PreorderListResult>>();

const preorderDetailCache = new Map<string, CacheEntry<PreorderDetailDTO>>();
const preorderDetailInFlight = new Map<string, Promise<PreorderDetailDTO>>();

const reservationListCache = new Map<
  string,
  CacheEntry<PreorderReservationDTO[]>
>();
const reservationListInFlight = new Map<
  string,
  Promise<PreorderReservationDTO[]>
>();

const productListCache = new Map<string, CacheEntry<AdminProductData[]>>();
const productListInFlight = new Map<string, Promise<AdminProductData[]>>();

const productDetailCache = new Map<string, CacheEntry<AdminProductData>>();
const productDetailInFlight = new Map<
  string,
  Promise<AdminProductData | null>
>();

let formOptionsCache: CacheEntry<AdminProductFormOptions> | null = null;
let formOptionsInFlight: Promise<AdminProductFormOptions> | null = null;

const remember = <T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  value: T,
  ttlMs: number,
  limit: number,
) => {
  cache.delete(key);
  cache.set(key, { value, expires: Date.now() + ttlMs });
  while (cache.size > limit) {
    const oldestKey = cache.keys().next().value;
    if (!oldestKey) break;
    cache.delete(oldestKey);
  }
};

const readThrough = <T>(
  cache: Map<string, CacheEntry<T>>,
  inFlight: Map<string, Promise<T>>,
  key: string,
  ttlMs: number,
  limit: number,
  load: () => Promise<T>,
): Promise<T> => {
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expires > now) {
    cache.delete(key);
    cache.set(key, cached);
    return Promise.resolve(cached.value);
  }

  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = load()
    .then((value) => {
      remember(cache, key, value, ttlMs, limit);
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, request);
  return request;
};

const toAdminPreorderListKey = (input: ListPreordersInput): string | null => {
  if (input.q?.trim()) return null;
  if (
    input.etaFrom ||
    input.etaTo ||
    input.minPrice !== undefined ||
    input.maxPrice !== undefined
  ) {
    return null;
  }

  return JSON.stringify({
    availability: input.availability ?? null,
    category: input.category ?? null,
    character: input.character ?? null,
    collection: input.collection ?? null,
    page: input.page ?? 1,
    pageSize: input.pageSize ?? 24,
    sort: input.sort ?? "created-desc",
    status: input.status ?? null,
  });
};

export const invalidateAdminCache = (): void => {
  preorderListCache.clear();
  preorderListInFlight.clear();
  preorderDetailCache.clear();
  preorderDetailInFlight.clear();
  reservationListCache.clear();
  reservationListInFlight.clear();
  productListCache.clear();
  productListInFlight.clear();
  productDetailCache.clear();
  productDetailInFlight.clear();
  formOptionsCache = null;
  formOptionsInFlight = null;
};

export const getCachedAdminPreorderList = (
  input: ListPreordersInput,
  load: () => Promise<PreorderListResult>,
): Promise<PreorderListResult> => {
  const key = toAdminPreorderListKey(input);
  if (!key) return load();
  return readThrough(
    preorderListCache,
    preorderListInFlight,
    key,
    LIST_TTL_MS,
    LIST_CACHE_LIMIT,
    load,
  );
};

export const getCachedAdminPreorderDetail = (
  id: string,
  load: () => Promise<PreorderDetailDTO>,
): Promise<PreorderDetailDTO> =>
  readThrough(
    preorderDetailCache,
    preorderDetailInFlight,
    id,
    DETAIL_TTL_MS,
    DETAIL_CACHE_LIMIT,
    load,
  );

export const getCachedAdminReservationList = (
  preorderId: string,
  load: () => Promise<PreorderReservationDTO[]>,
): Promise<PreorderReservationDTO[]> =>
  readThrough(
    reservationListCache,
    reservationListInFlight,
    preorderId,
    DETAIL_TTL_MS,
    DETAIL_CACHE_LIMIT,
    load,
  );

export const getCachedAdminProductList = (
  load: () => Promise<AdminProductData[]>,
): Promise<AdminProductData[]> =>
  readThrough(
    productListCache,
    productListInFlight,
    "all",
    LIST_TTL_MS,
    LIST_CACHE_LIMIT,
    load,
  );

export const getCachedAdminProductDetail = (
  id: string,
  load: () => Promise<AdminProductData | null>,
): Promise<AdminProductData | null> => {
  const now = Date.now();
  const cached = productDetailCache.get(id);
  if (cached && cached.expires > now) {
    productDetailCache.delete(id);
    productDetailCache.set(id, cached);
    return Promise.resolve(cached.value);
  }

  const pending = productDetailInFlight.get(id);
  if (pending) return pending;

  const request = load()
    .then((value) => {
      if (value) {
        remember(
          productDetailCache,
          id,
          value,
          DETAIL_TTL_MS,
          DETAIL_CACHE_LIMIT,
        );
      }
      return value;
    })
    .finally(() => {
      productDetailInFlight.delete(id);
    });

  productDetailInFlight.set(id, request);
  return request;
};

export const getCachedAdminProductFormOptions = (
  load: () => Promise<AdminProductFormOptions>,
): Promise<AdminProductFormOptions> => {
  const now = Date.now();
  if (formOptionsCache && formOptionsCache.expires > now) {
    return Promise.resolve(formOptionsCache.value);
  }
  if (formOptionsInFlight) return formOptionsInFlight;

  formOptionsInFlight = load()
    .then((value) => {
      formOptionsCache = {
        value,
        expires: Date.now() + FORM_OPTIONS_TTL_MS,
      };
      return value;
    })
    .finally(() => {
      formOptionsInFlight = null;
    });

  return formOptionsInFlight;
};
