import type { APIRoute } from "astro";
import { parseStoreSettingsFromForm } from "@/application/dto/storeSettings.dto";
import { saveStoreSettings } from "@/application/services/StoreSettingsService";

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  const user = locals.user;
  if (!user || user.role !== "ADMIN") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const formData = await request.formData();
  const content = parseStoreSettingsFromForm(formData);

  try {
    await saveStoreSettings(content, user.id);
    return redirect("/admin/social?saved=1", 303);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo guardar la configuración de redes";
    return redirect(`/admin/social?error=${encodeURIComponent(message)}`, 303);
  }
};
