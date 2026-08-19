import type { APIRoute } from "astro";
import { UploadPaymentProofUseCase } from "@/application/use-cases/uploadPaymentProof";
import { LocalPublicStorage } from "@/infrastructure/storage/localPublicStorage";
import { R2Storage } from "@/infrastructure/storage/r2Storage";

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
  if (error instanceof Error && error.message) return error.message;
  return "No se pudo subir el comprobante";
};

const uploadProof = async (file: File): Promise<string> => {
  try {
    const storage = new R2Storage();
    const useCase = new UploadPaymentProofUseCase(storage);
    return await useCase.execute({ file });
  } catch (storageError) {
    if (!import.meta.env.DEV || !isRecoverableStorageConfigError(storageError)) {
      throw storageError;
    }
    const fallback = new UploadPaymentProofUseCase(new LocalPublicStorage());
    return fallback.execute({ file });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const url = await uploadProof(file);
    return new Response(JSON.stringify({ url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("[Upload payment proof error]:", error);
    return new Response(JSON.stringify({ error: uploadErrorMessage(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
