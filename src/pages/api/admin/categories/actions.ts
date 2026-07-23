import type { APIRoute } from "astro";
import { PrismaProductRepository } from "@/infrastructure/database/PrismaProductRepository";
import { SaveCategoryUseCase } from "@/application/use-cases/admin/categories/SaveCategoryUseCase";
import { ArchiveCategoryUseCase } from "@/application/use-cases/admin/categories/ArchiveCategoryUseCase";
import { DeleteCategoryUseCase } from "@/application/use-cases/admin/categories/DeleteCategoryUseCase";
import { invalidateCatalogCache } from "@/application/services/CatalogQueryService";
import { invalidatePreorderCache } from "@/application/services/PreorderQueryCache";
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
    message.includes("Product_categoryId_fkey")
  ) {
    return "No se puede eliminar esta categoría porque tiene productos asociados. Desactívala o mueve esos productos a otra categoría antes de eliminarla.";
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
  const imageUrl = (formData.get("imageUrl") as string) || "";
  const isActive = formData.get("isActive") === "true";
  const isPopup = formData.get("isPopup") === "true";
  const wantsJson =
    formData.get("responseFormat") === "json" ||
    (request.headers.get("Accept") || "").includes("application/json");

  const repo = new PrismaProductRepository();

  try {
    if (_action === "create" || _action === "update") {
      const saveUseCase = new SaveCategoryUseCase(repo);
      await saveUseCase.execute({
        id,
        name,
        slug: "",
        imageUrl,
        deletedAt: isActive ? null : new Date(),
      });

      invalidateCatalogCache();
      invalidatePreorderCache();

      if (wantsJson && _action === "create") {
        const saved = await repo.findCategoryById(id);
        return new Response(
          JSON.stringify({
            data: {
              id,
              name,
              slug: saved?.slug ?? "",
              imageUrl,
            },
          }),
          {
            status: 201,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      if (isPopup && _action === "create") {
        return redirect(
          `/admin/success?type=category&value=${id}&label=${encodeURIComponent(name)}`,
        );
      }
    } else if (_action === "archive" || _action === "deactivate") {
      const archiveUseCase = new ArchiveCategoryUseCase(repo);
      const targetId = formData.get("id") as string;
      await archiveUseCase.execute(targetId);
    } else if (_action === "activate") {
      const targetId = formData.get("id") as string;
      const category = await repo.findCategoryById(targetId);
      if (!category) {
        throw new Error("Category not found");
      }

      const saveUseCase = new SaveCategoryUseCase(repo);
      await saveUseCase.execute({
        ...category,
        deletedAt: null,
      });
    } else if (_action === "delete") {
      const deleteUseCase = new DeleteCategoryUseCase(repo);
      const targetId = formData.get("id") as string;
      await deleteUseCase.execute(targetId);
    }

    invalidateCatalogCache();
    invalidatePreorderCache();
    return redirect("/admin/categories");
  } catch (error: unknown) {
    if (wantsJson) {
      return new Response(
        JSON.stringify({ error: friendlyErrorMessage(error) }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return redirectWithError(
      redirect,
      "/admin/categories",
      friendlyErrorMessage(error),
    );
  }
};
