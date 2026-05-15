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

export const success = <T>(
  data: T,
  init?: ResponseInit,
): Response =>
  new Response(JSON.stringify({ data } satisfies ApiSuccess<T>), {
    status: init?.status ?? 200,
    headers: {
      ...jsonHeaders,
      ...init?.headers,
    },
  });

export const failure = (error: unknown): Response => {
  const appError = ApplicationError.normalizeUnknownError(error);
  const body: ApiError = {
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details ? { details: appError.details } : {}),
    },
  };

  return new Response(JSON.stringify(body), {
    status: appError.statusCode,
    headers: jsonHeaders,
  });
};
