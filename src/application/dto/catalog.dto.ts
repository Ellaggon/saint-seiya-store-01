import type { ProductStatus } from "../../domain/entities/Product";

export interface ProductDTO {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  height: number;
  material: string;
  imageUrl: string;
  stock: number;
  status: ProductStatus;
}

export interface CategoryDTO {
  id: string;
  name: string;
}

export interface CharacterDTO {
  id: string;
  name: string;
}

export interface CreateProductRequestDTO {
  name: string;
  description: string;
  price: number;
  categoryId: string;
  height: number;
  material: string;
  imageUrl: string;
  stock: number;
  status: ProductStatus;
}

export interface CreateCategoryRequestDTO {
  name: string;
}

export interface CreateCharacterRequestDTO {
  name: string;
}
