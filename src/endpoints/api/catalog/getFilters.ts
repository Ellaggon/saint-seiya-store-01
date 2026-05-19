import { PrismaProductRepository } from "../../../infrastructure/database/PrismaProductRepository";
import { GetCatalogFiltersUseCase } from "../../../application/use-cases/catalog/GetCatalogFiltersUseCase";
import type { ProductFilters } from "@/domain/repositories/ProductRepository";

export async function getFilters(filters?: ProductFilters) {
  const repository = new PrismaProductRepository();
  const useCase = new GetCatalogFiltersUseCase(repository);

  return useCase.execute(filters);
}
