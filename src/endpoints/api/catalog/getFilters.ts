import { PrismaProductRepository } from "../../../infrastructure/database/PrismaProductRepository";
import { GetCatalogFiltersUseCase } from "../../../application/use-cases/catalog/GetCatalogFiltersUseCase";

export async function getFilters(filters?: any) {
  const repository = new PrismaProductRepository();
  const useCase = new GetCatalogFiltersUseCase(repository);

  return useCase.execute(filters);
}
