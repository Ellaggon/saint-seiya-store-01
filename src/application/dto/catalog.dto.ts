import type { ProductStatus } from "../../domain/entities/Product";

export interface ProductDTO {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  collectionId: string;
  height: number;
  material: string;
  imageUrl: string;
  stock: number;
  status: ProductStatus;
  line?: string;
  character?: string;
}

export interface CollectionDTO {
  id: string;
  name: string;
  slug: string;
}

export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  // count?: number;
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
  collectionId: string;
  height: number;
  material: string;
  imageUrl: string;
  stock: number;
  status: ProductStatus;
}

export interface CreateCollectionRequestDTO {
  name: string;
}

export interface CreateCategoryRequestDTO {
  name: string;
}

export interface CreateCharacterRequestDTO {
  name: string;
}

export interface CatalogMetadataDTO {
  categories: { id: string; name: string; slug: string; count: number }[];
  collections: { id: string; name: string; slug: string; count: number }[];
  characters: { id: string; name: string; slug: string; count: number }[];
}

export interface CatalogProductDTO {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  character?: string;
  line?: string;
  status: string;
}
