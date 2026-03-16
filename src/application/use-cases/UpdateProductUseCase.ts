import type { ProductRepository } from "../../domain/repositories/ProductRepository";
import type { CreateProductRequestDTO, ProductDTO } from "../dto/catalog.dto";
import { CatalogMapper } from "../dto/catalog.mapper";
import { Product } from "../../domain/entities/Product";

export interface UpdateProductRequest extends CreateProductRequestDTO {
  id: string;
}

export class UpdateProductUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(request: UpdateProductRequest): Promise<ProductDTO> {
    if (!request.id) throw new Error("Product ID is required");
    if (!request.categoryId) throw new Error("Category ID is required");
    if (!request.collectionId) throw new Error("Collection ID is required");

    const product = Product.create({
      id: request.id,
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
