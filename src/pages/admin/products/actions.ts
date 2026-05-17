import type { APIRoute } from "astro";
import { CreateProductUseCase } from "@/application/use-cases/CreateProductUseCase";
import { UpdateProductUseCase } from "@/application/use-cases/UpdateProductUseCase";
import { ArchiveProductUseCase } from "@/application/use-cases/admin/products/ArchiveProductUseCase";
import { ProductStatus } from "@/domain/entities/Product";
import { PrismaProductRepository } from "@/infrastructure/database/PrismaProductRepository";

// Helper to validate admin role (redundant because of middleware but safe)
const ensureAdmin = (locals: App.Locals) => {
  if (!locals.user || locals.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
};

const requiredString = (formData: FormData, key: string): string => {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required`);
  }
  return value.trim();
};

const optionalString = (formData: FormData, key: string): string | undefined => {
  const value = formData.get(key);
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
};

const requiredNumber = (formData: FormData, key: string): number => {
  const value = Number(requiredString(formData, key));
  if (!Number.isFinite(value)) {
    throw new Error(`${key} must be a valid number`);
  }
  return value;
};

const parseProductStatus = (formData: FormData): ProductStatus => {
  const status = requiredString(formData, "status");
  if (!Object.values(ProductStatus).includes(status as ProductStatus)) {
    throw new Error("Invalid product status");
  }
  return status as ProductStatus;
};

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  try {
    ensureAdmin(locals);

    const formData = await request.formData();
    const action = formData.get("_action");
    const repository = new PrismaProductRepository();

    if (action === "create") {
      const useCase = new CreateProductUseCase(repository);
      await useCase.execute({
        name: requiredString(formData, "name"),
        slug: optionalString(formData, "slug"),
        description: requiredString(formData, "description"),
        price: requiredNumber(formData, "price"),
        height: requiredNumber(formData, "height"),
        imageUrl: requiredString(formData, "imageUrl"),
        categoryId: requiredString(formData, "categoryId"),
        collectionId: requiredString(formData, "collectionId"),
        material: "",
        stock: 0,
        status: parseProductStatus(formData),
      });

      return redirect("/admin/products");
    }

    if (action === "update") {
      const useCase = new UpdateProductUseCase(repository);
      await useCase.execute({
        id: requiredString(formData, "id"),
        name: requiredString(formData, "name"),
        slug: optionalString(formData, "slug"),
        description: requiredString(formData, "description"),
        price: requiredNumber(formData, "price"),
        height: requiredNumber(formData, "height"),
        imageUrl: requiredString(formData, "imageUrl"),
        categoryId: requiredString(formData, "categoryId"),
        collectionId: requiredString(formData, "collectionId"),
        material: "",
        stock: 0,
        status: parseProductStatus(formData),
      });

      return redirect("/admin/products");
    }

    if (action === "delete") {
      const useCase = new ArchiveProductUseCase(repository);
      await useCase.execute(requiredString(formData, "id"));

      return redirect("/admin/products");
    }

    return new Response("Action not found", { status: 400 });
  } catch (error: unknown) {
    console.error("Admin Action Error:", error);
    return new Response(error instanceof Error ? error.message : "Internal Server Error", {
      status: 500,
    });
  }
};
