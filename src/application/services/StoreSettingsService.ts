import type { StoreSettingsContent } from "@/application/dto/storeSettings.dto";
import {
  DEFAULT_STORE_SETTINGS,
  normalizeStoreSettings,
  resolveStoreSettings,
} from "@/application/dto/storeSettings.dto";
import { prisma } from "@/infrastructure/database/prisma";

const STORE_SETTINGS_ID = "store";
const STORE_SETTINGS_CACHE_TTL_MS = 5 * 60_000;

let ensuredStoreSettingsTable = false;
let storeSettingsCache:
  | { value: StoreSettingsContent; expiresAt: number }
  | null = null;

const ensureStoreSettingsTable = async (): Promise<void> => {
  if (ensuredStoreSettingsTable) return;

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "StoreSettings" (
      "id" TEXT NOT NULL DEFAULT 'store',
      "content" JSONB NOT NULL,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedBy" TEXT,
      CONSTRAINT "StoreSettings_pkey" PRIMARY KEY ("id")
    );
  `);
  ensuredStoreSettingsTable = true;
};

const readStoredContent = async (): Promise<StoreSettingsContent> => {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ content: unknown }>>(
      `SELECT content FROM "StoreSettings" WHERE id = $1 LIMIT 1`,
      STORE_SETTINGS_ID,
    );

    return rows[0]
      ? normalizeStoreSettings(rows[0].content)
      : DEFAULT_STORE_SETTINGS;
  } catch (error) {
    console.warn("[StoreSettings] Falling back to defaults:", error);
    return DEFAULT_STORE_SETTINGS;
  }
};

/** Effective settings (DB + env fallback) for public pages. */
export async function getStoreSettings(): Promise<StoreSettingsContent> {
  if (storeSettingsCache && storeSettingsCache.expiresAt > Date.now()) {
    return storeSettingsCache.value;
  }

  const stored = await readStoredContent();
  const value = resolveStoreSettings(stored);

  storeSettingsCache = {
    value,
    expiresAt: Date.now() + STORE_SETTINGS_CACHE_TTL_MS,
  };

  return value;
}

/** Raw stored settings without env merge (for admin form honesty). */
export async function getStoredStoreSettings(): Promise<StoreSettingsContent> {
  return readStoredContent();
}

export async function saveStoreSettings(
  content: StoreSettingsContent,
  updatedBy?: string | null,
): Promise<StoreSettingsContent> {
  await ensureStoreSettingsTable();

  const normalized = normalizeStoreSettings(content);
  const payload = JSON.stringify(normalized);

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "StoreSettings" (id, content, "updatedAt", "updatedBy")
      VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP, $3)
      ON CONFLICT (id) DO UPDATE SET
        content = EXCLUDED.content,
        "updatedAt" = CURRENT_TIMESTAMP,
        "updatedBy" = EXCLUDED."updatedBy"
    `,
    STORE_SETTINGS_ID,
    payload,
    updatedBy ?? null,
  );

  const resolved = resolveStoreSettings(normalized);
  storeSettingsCache = {
    value: resolved,
    expiresAt: Date.now() + STORE_SETTINGS_CACHE_TTL_MS,
  };

  return resolved;
}

export const invalidateStoreSettingsCache = (): void => {
  storeSettingsCache = null;
};
