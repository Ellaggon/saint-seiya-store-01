import type { APIRoute } from "astro";
import { requireAdmin } from "@/endpoints/api/shared/auth";
import { failure, success } from "@/endpoints/api/shared/api-response";
import { ApplicationError } from "@/application/errors/ApplicationError";
import { R2Storage } from "@/infrastructure/storage/r2Storage";

const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    requireAdmin(locals);
    const body = (await request.json()) as {
      productId?: unknown;
      fileName?: unknown;
      contentType?: unknown;
      size?: unknown;
    };

    if (!isUuid(body.productId)) {
      throw ApplicationError.validation("Producto de destino inválido.");
    }
    if (typeof body.contentType !== "string" || !allowedTypes.has(body.contentType)) {
      throw ApplicationError.validation("Solo se permiten imágenes JPEG, PNG, WebP o AVIF.");
    }
    if (
      typeof body.size !== "number" ||
      !Number.isInteger(body.size) ||
      body.size <= 0 ||
      body.size > MAX_IMAGE_SIZE
    ) {
      throw ApplicationError.validation("Cada imagen debe pesar como máximo 20 MB.");
    }

    const imageId = crypto.randomUUID();
    const storageKey = `products/${body.productId}/${imageId}/master.${extensions[body.contentType]}`;
    const storage = new R2Storage();
    const uploadUrl = await storage.createPresignedUpload({
      key: storageKey,
      contentType: body.contentType,
      expiresInSeconds: 300,
    });

    return success({
      id: imageId,
      storageKey,
      publicUrl: storage.publicUrlForKey(storageKey),
      uploadUrl,
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
    });
  } catch (error) {
    return failure(error);
  }
};
