import type {
  ProductRepository,
  CollectionData,
} from "../../../../domain/repositories/ProductRepository";

export class SaveCollectionUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(collection: CollectionData): Promise<void> {
    if (!collection.id) {
      // Should be handled by domain or caller if new
    }
    return this.productRepository.saveCollection(collection);
  }
}
