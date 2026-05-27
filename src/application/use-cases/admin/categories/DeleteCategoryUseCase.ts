import type { ProductRepository } from "../../../../domain/repositories/ProductRepository";

export class DeleteCategoryUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(id: string): Promise<void> {
    return this.productRepository.deleteCategory(id);
  }
}
