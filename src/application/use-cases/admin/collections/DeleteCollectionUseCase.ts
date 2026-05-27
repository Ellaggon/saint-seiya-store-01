import type { ProductRepository } from "../../../../domain/repositories/ProductRepository";

export class DeleteCollectionUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(id: string): Promise<void> {
    return this.productRepository.deleteCollection(id);
  }
}
