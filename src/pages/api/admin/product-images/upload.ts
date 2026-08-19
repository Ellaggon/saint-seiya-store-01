import type { APIRoute } from "astro";
import { requireAdmin } from "@/endpoints/api/shared/auth";
import { failure, success } from "@/endpoints/api/shared/api-response";
import { ApplicationError } from "@/application/errors/ApplicationError";
import { optimizeImageForUpload } from "@/application/services/optimizeImageForUpload";
import { R2Storage } from "@/infrastructure/storage/r2Storage";

const MAX_PROXY_BYTES = 4 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    requireAdmin(locals);
    const formData = await request.formData();
    const productId = formData.get("productId");
    const imageId = formData.get("imageId");
    const file = formData.get("file");
    if (!isUuid(productId) || !isUuid(imageId) || !(file instanceof File)) {
      throw ApplicationError.validation("Carga de galería inválida.");
    }
    if (!allowedTypes.has(file.type) || file.size === 0) {
      throw ApplicationError.validation("Formato de imagen no permitido.");
    }
    if (file.size > MAX_PROXY_BYTES) {
      throw ApplicationError.validation("La conexión local requiere una imagen optimizada menor a 4 MB.");
    }

    const optimized = await optimizeImageForUpload(
      { data: new Uint8Array(await file.arrayBuffer()), name: file.name, type: file.type },
      { maxEdge: 1600, quality: 78 },
    );
    const storageKey = `products/${productId}/${imageId}/master.${optimized.name.split(".").pop() || "jpg"}`;
    const url = await new R2Storage().uploadAtKey(optimized, storageKey);
    return success({
      storageKey,
      publicUrl: url,
      byteSize: optimized.data.byteLength,
      mimeType: optimized.type,
    });
  } catch (error) {
    return failure(error);
  }
};
