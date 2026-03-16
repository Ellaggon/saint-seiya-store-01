import type {
  ProductRepository,
  CategoryData,
} from "../../../../domain/repositories/ProductRepository";

export class SaveCategoryUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(category: CategoryData): Promise<void> {
    return this.productRepository.saveCategory(category);
  }
}
