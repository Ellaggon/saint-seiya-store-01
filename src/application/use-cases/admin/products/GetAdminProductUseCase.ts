import type {
  AdminProductData,
  ProductRepository,
} from "@/domain/repositories/ProductRepository";

export class GetAdminProductUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(id: string): Promise<AdminProductData | null> {
    return this.productRepository.findAdminProductById(id);
  }
}
