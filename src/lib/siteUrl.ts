const DEFAULT_SITE_URL = "https://saint-seiya-store-01.vercel.app";

const normalizeOrigin = (value: string | undefined): string | null => {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    return null;
  }
};

export const siteOrigin =
  normalizeOrigin(import.meta.env.SITE_URL) ??
  normalizeOrigin(import.meta.env.PUBLIC_SITE_URL) ??
  DEFAULT_SITE_URL;

export const absoluteSiteUrl = (pathname: string): string =>
  new URL(pathname, siteOrigin).toString();
