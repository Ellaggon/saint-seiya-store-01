export interface PaginationInput {
  page?: number;
  pageSize?: number;
}

const toPositiveInt = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  const normalized = Math.trunc(parsed);
  return normalized > 0 ? normalized : undefined;
};

export const parsePagination = (params: URLSearchParams): PaginationInput => ({
  page: toPositiveInt(params.get("page")),
  pageSize: toPositiveInt(params.get("pageSize")),
});
