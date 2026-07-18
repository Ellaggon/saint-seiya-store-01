import type {
  PaginatedResultDTO,
  PreorderListItemDTO,
} from "@/application/dto/preorder.dto";
import type { ListPreordersInput } from "@/application/use-cases/preorders/ListPreorders";

type PreorderListResult = PaginatedResultDTO<PreorderListItemDTO>;

interface CacheEntry<T> {
  value: T;
  expires: number;
}

const PREORDER_LIST_TTL_MS = 60 * 1000;
const PREORDER_LIST_CACHE_LIMIT = 25;
const CACHEABLE_PAGE = 1;
const CACHEABLE_PAGE_SIZE = 24;

const preorderListCache = new Map<string, CacheEntry<PreorderListResult>>();
const preorderListInFlight = new Map<string, Promise<PreorderListResult>>();

const toCacheKey = (input: ListPreordersInput): string | null => {
  const page = input.page ?? CACHEABLE_PAGE;
  const pageSize = input.pageSize ?? CACHEABLE_PAGE_SIZE;
  if (page !== CACHEABLE_PAGE || pageSize !== CACHEABLE_PAGE_SIZE) return null;
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
    sort: input.sort ?? "created-desc",
    status: input.status ?? null,
  });
};

const remember = (key: string, value: PreorderListResult) => {
  preorderListCache.delete(key);
  preorderListCache.set(key, {
    value,
    expires: Date.now() + PREORDER_LIST_TTL_MS,
  });

  if (preorderListCache.size > PREORDER_LIST_CACHE_LIMIT) {
    const oldestKey = preorderListCache.keys().next().value;
    if (oldestKey) preorderListCache.delete(oldestKey);
  }
};

export const invalidatePreorderCache = (): void => {
  preorderListCache.clear();
  preorderListInFlight.clear();
};

export const getCachedPreorderList = (
  input: ListPreordersInput,
  load: () => Promise<PreorderListResult>,
): Promise<PreorderListResult> => {
  const key = toCacheKey(input);
  if (!key) return load();

  const now = Date.now();
  const cached = preorderListCache.get(key);
  if (cached && cached.expires > now) {
    preorderListCache.delete(key);
    preorderListCache.set(key, cached);
    return Promise.resolve(cached.value);
  }

  const inFlight = preorderListInFlight.get(key);
  if (inFlight) return inFlight;

  const request = load()
    .then((result) => {
      remember(key, result);
      return result;
    })
    .finally(() => {
      preorderListInFlight.delete(key);
    });

  preorderListInFlight.set(key, request);
  return request;
};
