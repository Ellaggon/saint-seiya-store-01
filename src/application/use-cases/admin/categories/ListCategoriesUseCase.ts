import type {
  ProductRepository,
  CategoryData,
} from "../../../../domain/repositories/ProductRepository";

export class ListCategoriesUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(): Promise<CategoryData[]> {
    return this.productRepository.findAllCategories();
  }
}
