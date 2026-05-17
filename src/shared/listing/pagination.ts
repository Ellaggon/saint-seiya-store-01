export interface PageParamDefaults {
  page?: number;
  pageSize?: number;
  maxPageSize?: number;
}

export interface PageParams {
  page?: number;
  pageSize?: number;
}

export const parsePositiveInt = (
  value: string | null | undefined,
  fallback?: number,
  max?: number,
): number | undefined => {
  if (!value) return fallback;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;

  const normalized = Math.trunc(parsed);
  if (normalized <= 0) return fallback;

  return max ? Math.min(normalized, max) : normalized;
};

export const parsePageParams = (
  params: URLSearchParams,
  defaults: PageParamDefaults = {},
): PageParams => ({
  page: parsePositiveInt(params.get("page"), defaults.page),
  pageSize: parsePositiveInt(
    params.get("pageSize"),
    defaults.pageSize,
    defaults.maxPageSize,
  ),
});
