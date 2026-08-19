import type { ProductStatus } from "../../domain/entities/Product";
import type { ProductImageProps } from "../../domain/entities/Product";
import type { CatalogSort } from "../../domain/repositories/ProductRepository";
import type { DisplayAvailability } from "@/shared/catalog/displayAvailability";

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
  images?: ProductImageProps[];
  stock: number;
  status: ProductStatus;
  line?: string;
  character?: string;
  category?: string;
  characters?: string[];
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
  id?: string;
  name: string;
  slug?: string;
  description: string;
  price: number;
  categoryId: string;
  collectionId: string;
  height: number;
  material?: string;
  imageUrl: string;
  images?: ProductImageProps[];
  stock?: number;
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
  categories: {
    id: string;
    name: string;
    slug: string;
    imageUrl?: string | null;
    count: number;
  }[];
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
  status: ProductStatus;
  displayAvailability?: DisplayAvailability;
  preorder?: {
    campaignId: string;
    etaLabel?: string | null;
    etaStart?: string | null;
    releaseDate?: string | null;
    availableUnits: number;
    totalUnits: number;
    depositAmount: number;
    isOpen: boolean;
  };
}

export interface CatalogPaginationDTO {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CatalogProductsResponseDTO {
  items: CatalogProductDTO[];
  pagination: CatalogPaginationDTO;
  sort: CatalogSort;
}
