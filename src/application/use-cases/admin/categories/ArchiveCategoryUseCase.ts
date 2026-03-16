import type { ProductRepository } from "../../../../domain/repositories/ProductRepository";

export class ArchiveCategoryUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(id: string): Promise<void> {
    return this.productRepository.archiveCategory(id);
  }
}
