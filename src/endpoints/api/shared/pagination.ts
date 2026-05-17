import { parsePageParams, type PageParams } from "@/shared/listing/pagination";

export type PaginationInput = PageParams;

export const parsePagination = (params: URLSearchParams): PaginationInput =>
  parsePageParams(params);
