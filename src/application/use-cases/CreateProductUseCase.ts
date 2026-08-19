import type { ProductRepository } from "../../domain/repositories/ProductRepository";
import type { CreateProductRequestDTO, ProductDTO } from "../dto/catalog.dto";

export class CreateProductUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(request: CreateProductRequestDTO): Promise<ProductDTO> {
    if (!request.categoryId) throw new Error("Category ID is required");
    if (!request.collectionId) throw new Error("Collection ID is required");

    const product = await this.productRepository.createAdminProduct({
      ...request,
      material: request.material ?? "",
      stock: request.stock ?? 0,
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
