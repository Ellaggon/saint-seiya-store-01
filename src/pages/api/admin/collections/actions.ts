import type { APIRoute } from "astro";
import { PrismaProductRepository } from "@/infrastructure/database/PrismaProductRepository";
import { SaveCollectionUseCase } from "@/application/use-cases/admin/collections/SaveCollectionUseCase";
import { ArchiveCollectionUseCase } from "@/application/use-cases/admin/collections/ArchiveCollectionUseCase";
import { randomUUID } from "node:crypto";

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  const user = locals.user;
  if (!user || user.role !== "ADMIN") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const formData = await request.formData();
  const _action = formData.get("_action");
  const id = (formData.get("id") as string) || randomUUID();
  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const description = formData.get("description") as string;
  const isActive = formData.get("isActive") === "true";
  const isPopup = formData.get("isPopup") === "true";

  const repo = new PrismaProductRepository();

  try {
    if (_action === "create" || _action === "update") {
      const saveUseCase = new SaveCollectionUseCase(repo);
      await saveUseCase.execute({
        id,
        name,
        slug,
        description,
        deletedAt: isActive ? null : new Date(),
      });

      if (isPopup && _action === "create") {
        return redirect(
          `/admin/success?type=collection&value=${id}&label=${encodeURIComponent(name)}`
        );
      }
    } else if (_action === "archive" || _action === "delete") {
      const archiveUseCase = new ArchiveCollectionUseCase(repo);
      const targetId = formData.get("id") as string;
      await archiveUseCase.execute(targetId);
    }

    return redirect("/admin/collections");
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
};
