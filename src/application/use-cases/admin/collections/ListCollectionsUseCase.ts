import type {
  ProductRepository,
  CollectionData,
} from "../../../../domain/repositories/ProductRepository";

export class ListCollectionsUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(): Promise<CollectionData[]> {
    return this.productRepository.findAllCollections();
  }
}
