import type { ProductRepository } from "@/domain/repositories/ProductRepository";

export class ArchiveProductUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(id: string): Promise<void> {
    if (!id) throw new Error("Product ID is required");
    await this.productRepository.delete(id);
  }
}
