import { PrismaProductRepository } from "@/infrastructure/database/PrismaProductRepository";
import { GetProductUseCase } from "@/application/use-cases/GetProductUseCase";
import { ProductStatus } from "@/domain/entities/Product";

export async function getProductById(id: string) {
  const repository = new PrismaProductRepository();
  const useCase = new GetProductUseCase(repository);

  const product = await useCase.execute(id);
  if (!product) return null;

  const allowedStatuses = new Set<ProductStatus>([
    ProductStatus.PUBLISHED,
    ProductStatus.PRE_ORDER,
    ProductStatus.OUT_OF_STOCK,
  ]);

  if (!allowedStatuses.has(product.status)) {
    return null;
  }

  return product;
}
