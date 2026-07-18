import type { APIRoute } from "astro";
import { PrismaProductRepository } from "@/infrastructure/database/PrismaProductRepository";
import { SaveCollectionUseCase } from "@/application/use-cases/admin/collections/SaveCollectionUseCase";
import { ArchiveCollectionUseCase } from "@/application/use-cases/admin/collections/ArchiveCollectionUseCase";
import { DeleteCollectionUseCase } from "@/application/use-cases/admin/collections/DeleteCollectionUseCase";
import { invalidateCatalogCache } from "@/application/services/CatalogQueryService";
import { randomUUID } from "node:crypto";

const redirectWithError = (
  redirect: (
    path: string,
    status?: 300 | 301 | 302 | 303 | 304 | 307 | 308,
  ) => Response,
  path: string,
  message: string,
): Response => {
  const params = new URLSearchParams({ error: message });
  return redirect(`${path}?${params.toString()}`, 303);
};

const friendlyErrorMessage = (error: unknown): string => {
  const message = error instanceof Error ? error.message : "Unexpected error";
  if (
    message.includes("Foreign key constraint") ||
    message.includes("Product_collectionId_fkey")
  ) {
    return "No se puede eliminar esta colección porque tiene productos asociados. Desactívala o mueve esos productos a otra colección antes de eliminarla.";
  }

  return message;
};

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
    } else if (_action === "archive" || _action === "deactivate") {
      const archiveUseCase = new ArchiveCollectionUseCase(repo);
      const targetId = formData.get("id") as string;
      await archiveUseCase.execute(targetId);
    } else if (_action === "activate") {
      const targetId = formData.get("id") as string;
      const collection = await repo.findCollectionById(targetId);
      if (!collection) {
        throw new Error("Collection not found");
      }

      const saveUseCase = new SaveCollectionUseCase(repo);
      await saveUseCase.execute({
        ...collection,
        deletedAt: null,
      });
    } else if (_action === "delete") {
      const deleteUseCase = new DeleteCollectionUseCase(repo);
      const targetId = formData.get("id") as string;
      await deleteUseCase.execute(targetId);
    }

    invalidateCatalogCache();
    return redirect("/admin/collections");
  } catch (error: unknown) {
    return redirectWithError(
      redirect,
      "/admin/collections",
      friendlyErrorMessage(error),
    );
  }
};
