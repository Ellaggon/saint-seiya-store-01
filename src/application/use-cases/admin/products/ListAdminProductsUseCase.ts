import type {
  AdminProductData,
  ProductRepository,
} from "@/domain/repositories/ProductRepository";

export class ListAdminProductsUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(): Promise<AdminProductData[]> {
    return this.productRepository.listAdminProducts();
  }
}
