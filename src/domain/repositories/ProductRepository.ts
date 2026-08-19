import type { Product } from "../entities/Product";
import type { ProductStatus } from "../entities/Product";
import type { ProductImageProps } from "../entities/Product";

export interface ProductFilters {
  q?: string;
  category?: string;
  collection?: string;
  character?: string;
  availability?: string;
  status?: string;
  minPrice?: number;
  maxPrice?: number;
  showSoldOut?: boolean;
  openPreorders?: boolean;
  sort?: CatalogSort;
  page?: number;
  pageSize?: number;
}

export type CatalogSort =
  | "created-desc"
  | "price-asc"
  | "price-desc"
  | "name-asc"
  | "eta-asc";

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
  deletedAt?: Date | null;
}

export interface CategoryData {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  deletedAt?: Date | null;
}

export interface AdminProductCategoryData {
  id: string;
  name: string;
  slug: string;
}

export interface AdminProductData {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  categoryId: string;
  collectionId: string;
  height: number;
  material?: string | null;
  imageUrl: string;
  images: ProductImageProps[];
  stock: number;
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  category?: AdminProductCategoryData | null;
}

export interface AdminProductInput {
  id?: string;
  name: string;
  slug?: string;
  description: string;
  price: number;
  categoryId: string;
  collectionId: string;
  height: number;
  material?: string | null;
  imageUrl: string;
  images?: ProductImageInput[];
  stock?: number;
  status: ProductStatus;
}

export interface ProductImageInput {
  id: string;
  storageKey: string;
  url: string;
  altText: string;
  sortOrder: number;
  width?: number | null;
  height?: number | null;
  byteSize?: number | null;
  mimeType?: string | null;
  checksum?: string | null;
}

export interface ProductRepository {
  findById(id: string): Promise<Product | null>;
  findAll(): Promise<Product[]>;
  findByCategory(categoryId: string): Promise<Product[]>;
  findByCollection(collectionId: string): Promise<Product[]>;
  listPublishedProducts(filters?: ProductFilters): Promise<Product[]>;
  getCatalogFilters(filters?: ProductFilters): Promise<CatalogMetadata>;
  listAdminProducts(): Promise<AdminProductData[]>;
  findAdminProductById(id: string): Promise<AdminProductData | null>;
  createAdminProduct(input: AdminProductInput): Promise<AdminProductData>;
  updateAdminProduct(
    input: AdminProductInput & { id: string },
  ): Promise<AdminProductData>;
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
