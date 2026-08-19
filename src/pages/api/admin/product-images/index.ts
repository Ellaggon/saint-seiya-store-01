import type { APIRoute } from "astro";
import { requireAdmin } from "@/endpoints/api/shared/auth";
import { failure, success } from "@/endpoints/api/shared/api-response";
import { ApplicationError } from "@/application/errors/ApplicationError";
import { R2Storage } from "@/infrastructure/storage/r2Storage";

const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    requireAdmin(locals);
    const body = (await request.json()) as { productId?: unknown; storageKey?: unknown };
    if (!isUuid(body.productId) || typeof body.storageKey !== "string" || !body.storageKey.startsWith(`products/${body.productId}/`)) {
      throw ApplicationError.validation("Imagen de producto inválida.");
    }
    await new R2Storage().delete(body.storageKey);
    return success({ deleted: true });
  } catch (error) {
    return failure(error);
  }
};
