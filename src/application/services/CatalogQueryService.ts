import type { ProductFilters } from "@/domain/repositories/ProductRepository";
import type {
  CatalogMetadataDTO,
  CatalogProductsResponseDTO,
} from "@/application/dto/catalog.dto";
import type { CatalogQueryRepository } from "@/application/repositories/CatalogQueryRepository";

interface CacheEntry<T> {
  value: T;
  expires: number;
}

const CATALOG_METADATA_TTL_MS = 10 * 60 * 1000;
const CATALOG_PRODUCTS_TTL_MS = 60 * 1000;
const CATALOG_PRODUCTS_CACHE_LIMIT = 50;
const CACHEABLE_PAGE = 1;
const CACHEABLE_PAGE_SIZE = 24;

let metadataCache: CacheEntry<CatalogMetadataDTO> | null = null;
let metadataInFlight: Promise<CatalogMetadataDTO> | null = null;

const productCache = new Map<string, CacheEntry<CatalogProductsResponseDTO>>();
const productInFlight = new Map<string, Promise<CatalogProductsResponseDTO>>();

const toCacheableProductKey = (filters?: ProductFilters): string | null => {
  const page = filters?.page ?? CACHEABLE_PAGE;
  const pageSize = filters?.pageSize ?? CACHEABLE_PAGE_SIZE;
  if (page !== CACHEABLE_PAGE || pageSize !== CACHEABLE_PAGE_SIZE) return null;
  if (filters?.q?.trim() || filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
    return null;
  }

  return JSON.stringify({
    availability: filters?.availability ?? null,
    category: filters?.category ?? null,
    character: filters?.character ?? null,
    collection: filters?.collection ?? null,
    openPreorders: filters?.openPreorders === true,
    showSoldOut: filters?.showSoldOut === true,
    sort: filters?.sort ?? "created-desc",
    status: filters?.status ?? null,
  });
};

const rememberProductResult = (
  key: string,
  value: CatalogProductsResponseDTO,
  now: number,
) => {
  productCache.delete(key);
  productCache.set(key, {
    value,
    expires: now + CATALOG_PRODUCTS_TTL_MS,
  });

  if (productCache.size > CATALOG_PRODUCTS_CACHE_LIMIT) {
    const oldestKey = productCache.keys().next().value;
    if (oldestKey) productCache.delete(oldestKey);
  }
};

export const invalidateCatalogCache = (): void => {
  metadataCache = null;
  metadataInFlight = null;
  productCache.clear();
  productInFlight.clear();
};

export class CatalogQueryService {
  constructor(private readonly repository: CatalogQueryRepository) {}

  async getCatalogProducts(
    filters?: ProductFilters,
  ): Promise<CatalogProductsResponseDTO> {
    const cacheKey = toCacheableProductKey(filters);
    if (!cacheKey) return this.repository.listCatalogProducts(filters);

    const now = Date.now();
    const cached = productCache.get(cacheKey);
    if (cached && cached.expires > now) {
      productCache.delete(cacheKey);
      productCache.set(cacheKey, cached);
      return cached.value;
    }

    const inFlight = productInFlight.get(cacheKey);
    if (inFlight) return inFlight;

    const request = this.repository
      .listCatalogProducts(filters)
      .then((products) => {
        rememberProductResult(cacheKey, products, Date.now());
        return products;
      })
      .finally(() => {
        productInFlight.delete(cacheKey);
      });

    productInFlight.set(cacheKey, request);
    return request;
  }

  async getCatalogMetadata(): Promise<CatalogMetadataDTO> {
    const now = Date.now();

    if (metadataCache && metadataCache.expires > now) {
      return metadataCache.value;
    }

    if (metadataInFlight) return metadataInFlight;

    metadataInFlight = this.repository
      .getCatalogMetadata()
      .then((filters) => {
        metadataCache = {
          value: filters,
          expires: Date.now() + CATALOG_METADATA_TTL_MS,
        };
        return filters;
      })
      .finally(() => {
        metadataInFlight = null;
      });

    return metadataInFlight;
  }
}
