import type { ProductRepository } from "../../domain/repositories/ProductRepository";
import type { ProductDTO } from "../dto/catalog.dto";
import { CatalogMapper } from "../dto/catalog.mapper";

export class GetProductUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(id: string): Promise<ProductDTO | null> {
    const product = await this.productRepository.findById(id);
    if (!product) return null;
    return CatalogMapper.productToDTO(product);
  }
}
