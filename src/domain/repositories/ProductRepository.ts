import type { Product } from "../entities/Product";

export interface ProductFilters {
  category?: string;
  collection?: string;
  character?: string;
  status?: string;
}

export interface CatalogMetadata {
  categories: {
    id: string;
    name: string;
    slug: string;
    imageUrl?: string | null;
    count?: number;
    _count?: { products: number };
  }[];
  collections: {
    id: string;
    name: string;
    slug: string;
    count?: number;
    _count?: { products: number };
  }[];
  characters: {
    id: string;
    name: string;
    slug: string;
    count?: number;
    _count?: { products: number };
  }[];
}

export interface CollectionData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  deletedAt?: Date | null;
}

export interface CategoryData {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  deletedAt?: Date | null;
}

export interface ProductRepository {
  findById(id: string): Promise<Product | null>;
  findAll(): Promise<Product[]>;
  findByCategory(categoryId: string): Promise<Product[]>;
  findByCollection(collectionId: string): Promise<Product[]>;
  listPublishedProducts(filters?: ProductFilters): Promise<Product[]>;
  getCatalogFilters(filters?: ProductFilters): Promise<CatalogMetadata>;
  save(product: Product): Promise<void>;
  delete(id: string): Promise<void>;

  // Collection Management
  findAllCollections(): Promise<CollectionData[]>;
  findCollectionById(id: string): Promise<CollectionData | null>;
  saveCollection(collection: CollectionData): Promise<void>;
  deleteCollection(id: string): Promise<void>;
  archiveCollection(id: string): Promise<void>;

  // Category Management
  findAllCategories(): Promise<CategoryData[]>;
  findCategoryById(id: string): Promise<CategoryData | null>;
  saveCategory(category: CategoryData): Promise<void>;
  deleteCategory(id: string): Promise<void>;
  archiveCategory(id: string): Promise<void>;
}
