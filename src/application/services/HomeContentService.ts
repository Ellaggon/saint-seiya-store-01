import type { HomePageContent } from "@/application/dto/homeContent.dto";
import {
  DEFAULT_HOME_CONTENT,
  normalizeHomeContent,
} from "@/application/dto/homeContent.dto";
import { prisma } from "@/infrastructure/database/prisma";

const HOME_CONTENT_ID = "home";
const HOME_CONTENT_CACHE_TTL_MS = 5 * 60_000;

let ensuredHomeContentTable = false;
let homeContentCache:
  | { value: HomePageContent; expiresAt: number }
  | null = null;

const ensureHomeContentTable = async (): Promise<void> => {
  if (ensuredHomeContentTable) return;

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "HomeContent" (
      "id" TEXT NOT NULL DEFAULT 'home',
      "content" JSONB NOT NULL,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedBy" TEXT,
      CONSTRAINT "HomeContent_pkey" PRIMARY KEY ("id")
    );
  `);
  ensuredHomeContentTable = true;
};

export async function getHomeContent(): Promise<HomePageContent> {
  if (homeContentCache && homeContentCache.expiresAt > Date.now()) {
    return homeContentCache.value;
  }

  try {
    // Avoid DDL on the public read path — table is created on save / migrate.
    const rows = await prisma.$queryRawUnsafe<Array<{ content: unknown }>>(
      `SELECT content FROM "HomeContent" WHERE id = $1 LIMIT 1`,
      HOME_CONTENT_ID,
    );

    const value = rows[0]
      ? normalizeHomeContent(rows[0].content)
      : DEFAULT_HOME_CONTENT;

    homeContentCache = {
      value,
      expiresAt: Date.now() + HOME_CONTENT_CACHE_TTL_MS,
    };

    return value;
  } catch (error) {
    console.warn("[HomeContent] Falling back to defaults:", error);
    return DEFAULT_HOME_CONTENT;
  }
}

export async function saveHomeContent(
  content: HomePageContent,
  updatedBy?: string | null,
): Promise<HomePageContent> {
  await ensureHomeContentTable();

  const normalized = normalizeHomeContent(content);
  const payload = JSON.stringify(normalized);

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "HomeContent" (id, content, "updatedAt", "updatedBy")
      VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP, $3)
      ON CONFLICT (id) DO UPDATE SET
        content = EXCLUDED.content,
        "updatedAt" = CURRENT_TIMESTAMP,
        "updatedBy" = EXCLUDED."updatedBy"
    `,
    HOME_CONTENT_ID,
    payload,
    updatedBy ?? null,
  );

  homeContentCache = {
    value: normalized,
    expiresAt: Date.now() + HOME_CONTENT_CACHE_TTL_MS,
  };

  return normalized;
}
