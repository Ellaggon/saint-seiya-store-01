import type { ProductRepository } from "../../../domain/repositories/ProductRepository";
import type { ProductDTO } from "../../dto/catalog.dto";
import { CatalogMapper } from "../../dto/catalog.mapper";

export class ListProductsUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(
    filters?: import("../../../domain/repositories/ProductRepository").ProductFilters,
  ): Promise<ProductDTO[]> {
    const products =
      await this.productRepository.listPublishedProducts(filters);
    return CatalogMapper.productListToDTO(products);
  }
}
