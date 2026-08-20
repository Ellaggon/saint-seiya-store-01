const mediaBaseUrl = () =>
  (process.env.R2_MEDIA_PUBLIC_URL || process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");

const GALLERY_PREFIX = (productId: string) => `products/${productId}/`;
const LEGACY_PRODUCT_OBJECT = /^products\/[0-9a-f-]{36}\.[a-z0-9]+$/i;

/** Legacy rows may still hold complete URLs while new rows store immutable R2 keys. */
export const productImageUrl = (storageKey: string): string => {
  if (/^https?:\/\//.test(storageKey) || storageKey.startsWith("/")) return storageKey;
  const baseUrl = mediaBaseUrl();
  return baseUrl ? `${baseUrl}/${storageKey}` : storageKey;
};

const extractStorageKey = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("products/")) {
    return trimmed.split("?")[0];
  }

  const fromPath = (path: string): string | null => {
    const marker = "/products/";
    const index = path.indexOf(marker);
    if (index === -1) return null;
    return path.slice(index + 1).split("?")[0];
  };

  if (trimmed.startsWith("/")) {
    return fromPath(trimmed);
  }

  try {
    return fromPath(new URL(trimmed).pathname);
  } catch {
    return null;
  }
};

/** Only keys that belong to this product (gallery prefix or its legacy cover object). */
export const toDeletableProductStorageKey = (
  value: string,
  productId: string,
): string | null => {
  const key = extractStorageKey(value);
  if (!key) return null;
  if (key.startsWith(GALLERY_PREFIX(productId))) return key;
  if (LEGACY_PRODUCT_OBJECT.test(key)) return key;
  return null;
};

export const collectProductStorageKeys = (
  productId: string,
  values: Array<string | null | undefined>,
): string[] => {
  const keys = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    const key = toDeletableProductStorageKey(value, productId);
    if (key) keys.add(key);
  }
  return [...keys];
};
