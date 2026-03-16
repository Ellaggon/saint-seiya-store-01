import { PrismaProductRepository } from "../../../infrastructure/database/PrismaProductRepository";
import { ListProductsUseCase } from "../../../application/use-cases/catalog/ListProductsUseCase";

export async function getProducts(
  filters?: import("../../../domain/repositories/ProductRepository").ProductFilters,
) {
  const repository = new PrismaProductRepository();
  const useCase = new ListProductsUseCase(repository);

  return useCase.execute(filters);
}
