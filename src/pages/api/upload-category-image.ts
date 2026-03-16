import type { APIRoute } from "astro";
import { UploadCategoryImageUseCase } from "../../application/use-cases/uploadCategoryImage";
import { R2Storage } from "../../infrastructure/storage/r2Storage";

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

    const storage = new R2Storage();
    const useCase = new UploadCategoryImageUseCase(storage);

    const url = await useCase.execute({ file });

    return new Response(JSON.stringify({ url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Category Upload API Error]:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
