import type { ProductRepository } from "../../domain/repositories/ProductRepository";
import type { CreateProductRequestDTO, ProductDTO } from "../dto/catalog.dto";

export interface UpdateProductRequest extends CreateProductRequestDTO {
  id: string;
}

export class UpdateProductUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(request: UpdateProductRequest): Promise<ProductDTO> {
    if (!request.id) throw new Error("Product ID is required");
    if (!request.categoryId) throw new Error("Category ID is required");
    if (!request.collectionId) throw new Error("Collection ID is required");

    const product = await this.productRepository.updateAdminProduct({
      ...request,
    });

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      categoryId: product.categoryId,
      collectionId: product.collectionId,
      height: product.height,
      material: product.material ?? "",
      imageUrl: product.imageUrl,
      images: product.images,
      stock: product.stock,
      status: product.status,
    };
  }
}
