import type { ProductRepository } from "@/domain/repositories/ProductRepository";
import {
  getCachedAdminProductFormOptions,
  type AdminProductFormOptions,
} from "@/application/services/AdminQueryCache";
import { ListCollectionsUseCase } from "@/application/use-cases/ListCollectionsUseCase";
import { PrismaCollectionRepository } from "@/infrastructure/database/PrismaCollectionRepository";

/**
 * Shared admin product form lookups — parallel + short process cache.
 * Avoids sequential HTTP self-fetches to /api/categories and /api/collections.
 */
export const loadAdminProductFormOptions = (
  productRepository: ProductRepository,
): Promise<AdminProductFormOptions> =>
  getCachedAdminProductFormOptions(async () => {
    const listCollections = new ListCollectionsUseCase(
      new PrismaCollectionRepository(),
    );

    const [categories, collections] = await Promise.all([
      productRepository.findAllCategories(),
      listCollections.execute(),
    ]);

    return { categories, collections };
  });
