import type { ProductRepository } from "../../domain/repositories/ProductRepository";
import type { ProductDTO } from "../dto/catalog.dto";
import { CatalogMapper } from "../dto/catalog.mapper";

export class ListProductsUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(): Promise<ProductDTO[]> {
    const products = await this.productRepository.findAll();
    return CatalogMapper.productListToDTO(products);
  }
}
