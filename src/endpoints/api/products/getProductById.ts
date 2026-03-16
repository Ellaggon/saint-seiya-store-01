import { PrismaProductRepository } from "@/infrastructure/database/PrismaProductRepository";
import { GetProductUseCase } from "@/application/use-cases/GetProductUseCase";

export async function getProductById(id: string) {
  const repository = new PrismaProductRepository();
  const useCase = new GetProductUseCase(repository);

  return useCase.execute(id);
}
