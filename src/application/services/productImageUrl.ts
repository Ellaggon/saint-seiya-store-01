const mediaBaseUrl = () =>
  (process.env.R2_MEDIA_PUBLIC_URL || process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");

/** Legacy rows may still hold complete URLs while new rows store immutable R2 keys. */
export const productImageUrl = (storageKey: string): string => {
  if (/^https?:\/\//.test(storageKey) || storageKey.startsWith("/")) return storageKey;
  const baseUrl = mediaBaseUrl();
  return baseUrl ? `${baseUrl}/${storageKey}` : storageKey;
};
