import type { APIRoute } from "astro";
import { UploadHomeImageUseCase } from "../../application/use-cases/uploadHomeImage";
import { LocalPublicStorage } from "../../infrastructure/storage/localPublicStorage";
import { R2Storage } from "../../infrastructure/storage/r2Storage";

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
  const user = locals.user;
  if (!user || user.role !== "ADMIN") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file || !(file instanceof File) || file.size === 0) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let url: string;
    try {
      const storage = new R2Storage();
      const useCase = new UploadHomeImageUseCase(storage);
      url = await useCase.execute({ file });
    } catch (storageError) {
      // In local/dev always fall back to disk if R2 is misconfigured or unreachable.
      if (!import.meta.env.DEV) {
        throw storageError;
      }

      console.warn(
        "[Upload Home API Warning]: R2 unavailable in development. Falling back to local public storage.",
        storageError,
      );
      const fallbackUseCase = new UploadHomeImageUseCase(
        new LocalPublicStorage(),
      );
      url = await fallbackUseCase.execute({ file });
    }

    return new Response(JSON.stringify({ url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("[Upload Home API Error]:", error);
    const message = uploadErrorMessage(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
