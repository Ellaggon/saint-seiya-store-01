import type { APIRoute } from "astro";

import { ApplicationError } from "@/application/errors/ApplicationError";
import { failure, success } from "@/endpoints/api/shared/api-response";

const WARMUP_PATHS = [
  "/catalog",
  "/catalog/partials/products",
  "/catalog?sort=price-asc",
  "/preorders",
] as const;

const authorizeCron = (request: Request): void => {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    throw ApplicationError.unauthorized();
  }
};

const warmPath = async (
  origin: string,
  path: (typeof WARMUP_PATHS)[number],
): Promise<{
  path: string;
  ok: boolean;
  status: number;
  durationMs: number;
  cache: string | null;
}> => {
  const startedAt = Date.now();
  const response = await fetch(new URL(path, origin), {
    headers: {
      "x-cache-warmup": "1",
    },
    redirect: "follow",
  });

  return {
    path,
    ok: response.ok,
    status: response.status,
    durationMs: Date.now() - startedAt,
    cache: response.headers.get("x-vercel-cache"),
  };
};

export const GET: APIRoute = async ({ request }) => {
  const startedAt = Date.now();

  try {
    authorizeCron(request);

    const origin = new URL(request.url).origin;
    const warmed = await Promise.all(
      WARMUP_PATHS.map((path) => warmPath(origin, path)),
    );
    const durationMs = Date.now() - startedAt;

    console.info("[cache:warm-catalog]", { durationMs, warmed });

    return success({
      warmed,
      durationMs,
    });
  } catch (error) {
    if (!(error instanceof ApplicationError && error.code === "UNAUTHORIZED")) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      console.error("[cache:warm-catalog:error]", { message });
    }

    return failure(error);
  }
};
