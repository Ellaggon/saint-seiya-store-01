import { ApplicationError } from "@/application/errors/ApplicationError";

export interface ApiSuccess<T> {
  data: T;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

const jsonHeaders = {
  "Content-Type": "application/json",
};

const json = (body: unknown, init?: ResponseInit): Response =>
  new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      ...jsonHeaders,
      ...init?.headers,
    },
  });

export const success = <T>(
  data: T,
  init?: ResponseInit,
): Response =>
  json({ data } satisfies ApiSuccess<T>, init);

// Legacy JSON endpoints still return the raw payload for compatibility.
// New endpoints should use success() instead.
export const legacySuccess = <T>(data: T, init?: ResponseInit): Response =>
  json(data, init);

// Legacy endpoints keep raw success payloads, but should still expose a
// predictable error envelope without leaking preorder-specific defaults.
export const legacyFailure = (error: unknown): Response => {
  const message = error instanceof Error ? error.message : "Unexpected error";
  const body: ApiError = {
    error: {
      code: "LEGACY_API_ERROR",
      message,
    },
  };

  return json(body, { status: 500 });
};

export const failure = (error: unknown): Response => {
  const appError = ApplicationError.normalizeUnknownError(error);
  const body: ApiError = {
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details ? { details: appError.details } : {}),
    },
  };

  return json(body, { status: appError.statusCode });
};
