export type StoreSettingsContent = {
  /** Digits-only WhatsApp for footer social icon */
  socialWhatsApp: string;
  /** Digits-only WhatsApp for cart "Pedir por WhatsApp" CTA */
  cartWhatsApp: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
};

const trim = (value: string | undefined | null): string =>
  value?.trim() ?? "";

const digitsOnly = (value: string): string => value.replace(/\D/g, "");

const asOptionalString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const envDefaults = (): StoreSettingsContent => ({
  socialWhatsApp: digitsOnly(trim(import.meta.env.PUBLIC_WHATSAPP_NUMBER)),
  cartWhatsApp: digitsOnly(trim(import.meta.env.PUBLIC_WHATSAPP_NUMBER)),
  instagramUrl: "",
  facebookUrl:
    trim(import.meta.env.PUBLIC_FACEBOOK_URL) ||
    trim(import.meta.env.PUBLIC_MESSENGER_URL),
  tiktokUrl: "",
});

export const DEFAULT_STORE_SETTINGS: StoreSettingsContent = {
  socialWhatsApp: "",
  cartWhatsApp: "",
  instagramUrl: "",
  facebookUrl: "",
  tiktokUrl: "",
};

const normalizeHandleOrUrl = (
  raw: string,
  platform: "instagram" | "facebook" | "tiktok",
): string => {
  const value = raw.trim();
  if (!value) return "";

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const handle = value.replace(/^@/, "").replace(/^\/+/, "");
  if (!handle) return "";

  if (platform === "instagram") {
    return `https://instagram.com/${handle}`;
  }
  if (platform === "facebook") {
    return `https://facebook.com/${handle}`;
  }
  return `https://www.tiktok.com/@${handle.replace(/^@/, "")}`;
};

export const normalizeStoreSettings = (
  raw: unknown,
): StoreSettingsContent => {
  const record =
    typeof raw === "object" && raw !== null
      ? (raw as Record<string, unknown>)
      : {};

  return {
    socialWhatsApp: digitsOnly(asOptionalString(record.socialWhatsApp)),
    cartWhatsApp: digitsOnly(asOptionalString(record.cartWhatsApp)),
    instagramUrl: normalizeHandleOrUrl(
      asOptionalString(record.instagramUrl),
      "instagram",
    ),
    facebookUrl: normalizeHandleOrUrl(
      asOptionalString(record.facebookUrl),
      "facebook",
    ),
    tiktokUrl: normalizeHandleOrUrl(
      asOptionalString(record.tiktokUrl),
      "tiktok",
    ),
  };
};

/** Merge stored settings with env fallbacks for empty fields. */
export const resolveStoreSettings = (
  stored: StoreSettingsContent,
): StoreSettingsContent => {
  const defaults = envDefaults();
  return {
    socialWhatsApp: stored.socialWhatsApp || defaults.socialWhatsApp,
    cartWhatsApp: stored.cartWhatsApp || defaults.cartWhatsApp,
    instagramUrl: stored.instagramUrl || defaults.instagramUrl,
    facebookUrl: stored.facebookUrl || defaults.facebookUrl,
    tiktokUrl: stored.tiktokUrl || defaults.tiktokUrl,
  };
};

export const parseStoreSettingsFromForm = (
  formData: FormData,
): StoreSettingsContent =>
  normalizeStoreSettings({
    socialWhatsApp: formData.get("socialWhatsApp"),
    cartWhatsApp: formData.get("cartWhatsApp"),
    instagramUrl: formData.get("instagramUrl"),
    facebookUrl: formData.get("facebookUrl"),
    tiktokUrl: formData.get("tiktokUrl"),
  });
