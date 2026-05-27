import type { APIRoute } from "astro";
import { UploadCategoryImageUseCase } from "../../application/use-cases/uploadCategoryImage";
import { LocalPublicStorage } from "../../infrastructure/storage/localPublicStorage";
import { R2Storage } from "../../infrastructure/storage/r2Storage";

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

export const POST: APIRoute = async ({ request }) => {
  try {
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
      const useCase = new UploadCategoryImageUseCase(storage);
      url = await useCase.execute({ file });
    } catch (storageError) {
      if (!import.meta.env.DEV || !isRecoverableStorageConfigError(storageError)) {
        throw storageError;
      }

      console.warn(
        "[Category Upload API Warning]: R2 is not available in development. Falling back to local public storage.",
        storageError,
      );
      const fallbackUseCase = new UploadCategoryImageUseCase(
        new LocalPublicStorage(),
      );
      url = await fallbackUseCase.execute({ file });
    }

    return new Response(JSON.stringify({ url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("[Category Upload API Error]:", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
