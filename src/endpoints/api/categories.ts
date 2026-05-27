import type { APIRoute } from "astro";
import { ListCategoriesUseCase } from "@/application/use-cases/admin/categories/ListCategoriesUseCase";
import { legacyFailure, legacySuccess } from "@/endpoints/api/shared/api-response";
import { PrismaProductRepository } from "@/infrastructure/database/PrismaProductRepository";

// Quick endpoint for categories (Sagas)
export const GET: APIRoute = async () => {
  try {
    const repository = new PrismaProductRepository();
    const useCase = new ListCategoriesUseCase(repository);
    const categories = await useCase.execute();

    return legacySuccess(categories);
  } catch (error: unknown) {
    return legacyFailure(error);
  }
};
