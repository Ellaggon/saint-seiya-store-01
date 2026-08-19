import type { APIRoute } from "astro";
import { CreateProductUseCase } from "@/application/use-cases/CreateProductUseCase";
import { UpdateProductUseCase } from "@/application/use-cases/UpdateProductUseCase";
import { ArchiveProductUseCase } from "@/application/use-cases/admin/products/ArchiveProductUseCase";
import { ProductStatus } from "@/domain/entities/Product";
import { PrismaProductRepository } from "@/infrastructure/database/PrismaProductRepository";
import { invalidateCatalogCache } from "@/application/services/CatalogQueryService";
import { invalidatePreorderCache } from "@/application/services/PreorderQueryCache";
import type { ProductImageInput } from "@/domain/repositories/ProductRepository";
import { R2Storage } from "@/infrastructure/storage/r2Storage";

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

const safeReturnTo = (formData: FormData): string => {
  const value = optionalString(formData, "returnTo");
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/admin/products";
  }

  return value;
};

const requiredNumber = (formData: FormData, key: string): number => {
  const value = Number(requiredString(formData, key));
  if (!Number.isFinite(value)) {
    throw new Error(`${key} must be a valid number`);
  }
  return value;
};

const requiredNonNegativeInteger = (formData: FormData, key: string): number => {
  const value = Number(requiredString(formData, key));
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${key} must be a non-negative integer`);
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

const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const parseProductImages = (
  formData: FormData,
  productId: string,
  productName: string,
  allowLegacyUrls = false,
): ProductImageInput[] | undefined => {
  const raw = formData.get("images");
  if (typeof raw !== "string" || !raw.trim()) return undefined;

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("La galería de imágenes no es válida");
  }
  if (!Array.isArray(value) || value.length === 0 || value.length > 12) {
    throw new Error("El producto debe tener entre 1 y 12 imágenes");
  }

  return value.map((item, index) => {
    const image = item as Record<string, unknown>;
    const id = image.id;
    const storageKey = image.storageKey;
    if (!isUuid(id) || typeof storageKey !== "string") {
      throw new Error("Una imagen de la galería es inválida");
    }
    const expectedPrefix = `products/${productId}/${id}/`;
    const isLegacyUrl = /^https?:\/\//.test(storageKey) || storageKey.startsWith("/");
    if (!storageKey.startsWith(expectedPrefix) && !(allowLegacyUrls && isLegacyUrl)) {
      throw new Error("La imagen no pertenece a este producto");
    }
    const suppliedAlt = typeof image.altText === "string" ? image.altText.trim() : "";
    return {
      id,
      storageKey,
      url: "",
      altText:
        suppliedAlt && !suppliedAlt.startsWith("Figura - vista")
          ? suppliedAlt
          : `${productName} - vista ${index + 1}`,
      sortOrder: index,
      width: typeof image.width === "number" ? image.width : null,
      height: typeof image.height === "number" ? image.height : null,
      byteSize: typeof image.byteSize === "number" ? image.byteSize : null,
      mimeType: typeof image.mimeType === "string" ? image.mimeType : null,
    };
  });
};

const parseRemovedImageKeys = (formData: FormData, productId: string): string[] => {
  const raw = formData.get("removedImageKeys");
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const keys = JSON.parse(raw);
    if (!Array.isArray(keys)) return [];
    return keys.filter(
      (key): key is string =>
        typeof key === "string" && key.startsWith(`products/${productId}/`),
    );
  } catch {
    return [];
  }
};

const deleteRemovedObjects = async (keys: string[]): Promise<void> => {
  if (!keys.length) return;
  try {
    const storage = new R2Storage();
    await Promise.allSettled(keys.map((key) => storage.delete(key)));
  } catch (error) {
    console.warn("[Product media cleanup] unable to delete removed objects", error);
  }
};

const verifyUploadedImages = async (images: ProductImageInput[] | undefined): Promise<void> => {
  if (!images?.length) return;
  const storage = new R2Storage();
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
  await Promise.all(
    images
      .filter((image) => image.storageKey.startsWith("products/"))
      .map(async (image) => {
        const object = await storage.head(image.storageKey);
        if (!object.contentLength || object.contentLength > 20 * 1024 * 1024) {
          throw new Error("Una imagen no cumple el límite de 20 MB");
        }
        if (!object.contentType || !allowedTypes.has(object.contentType)) {
          throw new Error("Una imagen tiene un formato no permitido");
        }
      }),
  );
};

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  try {
    ensureAdmin(locals);

    const formData = await request.formData();
    const action = formData.get("_action");
    const repository = new PrismaProductRepository();

    if (action === "create") {
      const productId = requiredString(formData, "productId");
      if (!isUuid(productId)) throw new Error("ID de producto inválido");
      const name = requiredString(formData, "name");
      const images = parseProductImages(formData, productId, name);
      await verifyUploadedImages(images);
      const useCase = new CreateProductUseCase(repository);
      await useCase.execute({
        id: productId,
        name,
        description: requiredString(formData, "description"),
        price: requiredNumber(formData, "price"),
        height: requiredNumber(formData, "height"),
        imageUrl: images?.[0]?.url || requiredString(formData, "imageUrl"),
        images,
        categoryId: requiredString(formData, "categoryId"),
        collectionId: requiredString(formData, "collectionId"),
        material: "",
        stock: requiredNonNegativeInteger(formData, "stock"),
        status: parseProductStatus(formData),
      });

      await deleteRemovedObjects(parseRemovedImageKeys(formData, productId));

      invalidateCatalogCache();
      invalidatePreorderCache();
      return redirect(safeReturnTo(formData));
    }

    if (action === "update") {
      const productId = requiredString(formData, "id");
      const name = requiredString(formData, "name");
      const images = parseProductImages(formData, productId, name, true);
      await verifyUploadedImages(images);
      const useCase = new UpdateProductUseCase(repository);
      await useCase.execute({
        id: productId,
        name,
        description: requiredString(formData, "description"),
        price: requiredNumber(formData, "price"),
        height: requiredNumber(formData, "height"),
        imageUrl: images?.[0]?.url || requiredString(formData, "imageUrl"),
        images,
        categoryId: requiredString(formData, "categoryId"),
        collectionId: requiredString(formData, "collectionId"),
        material: "",
        stock: requiredNonNegativeInteger(formData, "stock"),
        status: parseProductStatus(formData),
      });

      await deleteRemovedObjects(parseRemovedImageKeys(formData, productId));

      invalidateCatalogCache();
      invalidatePreorderCache();
      return redirect("/admin/products");
    }

    if (action === "delete") {
      const useCase = new ArchiveProductUseCase(repository);
      await useCase.execute(requiredString(formData, "id"));

      invalidateCatalogCache();
      invalidatePreorderCache();
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
