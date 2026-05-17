export const buildPageUrl = (
  pathname: string,
  origin: string,
  searchParams: URLSearchParams,
  page: number,
): string => {
  const url = new URL(pathname, origin);
  searchParams.forEach((value, key) => url.searchParams.set(key, value));
  url.searchParams.set("page", String(page));
  return `${url.pathname}?${url.searchParams.toString()}`;
};
