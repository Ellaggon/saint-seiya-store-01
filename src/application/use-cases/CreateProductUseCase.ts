import { Product } from "../../domain/entities/Product";
import type { ProductRepository } from "../../domain/repositories/ProductRepository";
import type { CreateProductRequestDTO, ProductDTO } from "../dto/catalog.dto";
import { CatalogMapper } from "../dto/catalog.mapper";

export class CreateProductUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(request: CreateProductRequestDTO): Promise<ProductDTO> {
    if (!request.categoryId) throw new Error("Category ID is required");
    if (!request.collectionId) throw new Error("Collection ID is required");

    const product = Product.create({
      id: crypto.randomUUID(),
      name: request.name,
      description: request.description,
      price: request.price,
      categoryId: request.categoryId,
      collectionId: request.collectionId,
      height: request.height,
      material: request.material,
      imageUrl: request.imageUrl,
      stock: request.stock,
      status: request.status,
    });

    await this.productRepository.save(product);
    return CatalogMapper.productToDTO(product);
  }
}
