import type { APIRoute } from "astro";
import { UploadProductImageUseCase } from "../../application/use-cases/uploadProductImage";
import { LocalPublicStorage } from "../../infrastructure/storage/localPublicStorage";
import { R2Storage } from "../../infrastructure/storage/r2Storage";
import { requireAdmin } from "./shared/auth";

const isRecoverableStorageConfigError = (error: unknown): boolean => {
  const record =
    typeof error === "object" && error !== null
      ? (error as { Code?: string; name?: string; message?: string })
      : null;
  const message = record?.message ?? "";
  const code = record?.Code ?? record?.name ?? "";

  return (
    code === "NoSuchBucket" ||
    code === "AccessDenied" ||
    message.includes("specified bucket") ||
    message.includes("Access Denied") ||
    message.includes("Missing required environment variable")
  );
};

const uploadErrorMessage = (error: unknown): string => {
  const record =
    typeof error === "object" && error !== null
      ? (error as { Code?: string; name?: string; message?: string })
      : null;
  const message = record?.message ?? "";
  const code = record?.Code ?? record?.name ?? "";

  if (code === "NoSuchBucket" || message.includes("specified bucket")) {
    return "El bucket de R2 configurado no existe. Revisa R2_BUCKET o R2_BUCKET_NAME en el entorno.";
  }

  if (
    code === "EPROTO" ||
    message.includes("SSL") ||
    message.includes("TLS") ||
    message.includes("handshake")
  ) {
    return "No se pudo conectar por TLS con R2. Revisa que R2_ENDPOINT sea la URL HTTPS completa del endpoint S3 de Cloudflare R2.";
  }

  if (message.includes("Missing required environment variable")) {
    return message;
  }

  return message || "Unexpected error";
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    requireAdmin(locals);
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let url: string;
    try {
      const storage = new R2Storage();
      const useCase = new UploadProductImageUseCase(storage);
      url = await useCase.execute({ file });
    } catch (storageError) {
      if (!import.meta.env.DEV || !isRecoverableStorageConfigError(storageError)) {
        throw storageError;
      }

      console.warn(
        "[Upload API Warning]: R2 is not available in development. Falling back to local public storage.",
        storageError,
      );
      const fallbackUseCase = new UploadProductImageUseCase(new LocalPublicStorage());
      url = await fallbackUseCase.execute({ file });
    }

    return new Response(JSON.stringify({ url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("[Upload API Error]:", error);
    const message = uploadErrorMessage(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
