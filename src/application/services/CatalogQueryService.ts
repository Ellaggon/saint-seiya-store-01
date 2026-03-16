import { prisma } from "@/infrastructure/database/prisma";
import { ProductStatus } from "@/domain/entities/Product";
import type { ProductFilters } from "@/domain/repositories/ProductRepository";
import type {
  CatalogMetadataDTO,
  CatalogProductDTO,
} from "@/application/dto/catalog.dto";

interface CachedMetadata {
  filters: CatalogMetadataDTO;
  expires: number;
}

const METADATA_TTL = 10 * 60 * 1000; // 10 minutes
const ALL_PRODUCTS_TTL = 10 * 60 * 1000; // 10 minutes

// Phase 3: Server Memory Catalog Cache
let allProductsCache: any[] | null = null;
let allProductsCacheExpires = 0;

let metadataCache: CachedMetadata | null = null;

export class CatalogQueryService {
  async getCatalogProducts(
    filters?: ProductFilters,
  ): Promise<CatalogProductDTO[]> {
    const now = Date.now();

    const startTotal = performance.now();

    // 1. Fetch ALL published products if cache is empty or expired
    if (!allProductsCache || allProductsCacheExpires <= now) {
      console.log(`[CatalogQueryService] All Products Cache Miss. Fetching from DB...`);
      console.time("query_products_db");
      
      const allProducts = await prisma.product.findMany({
        where: {
          deletedAt: null,
          status: {
            in: [ProductStatus.PUBLISHED, ProductStatus.PRE_ORDER],
          },
        },
        select: {
          id: true,
          name: true,
          price: true,
          imageUrl: true,
          status: true,
          createdAt: true,
          category: {
            select: { slug: true },
          },
          collection: {
            select: { name: true, slug: true },
          },
          characters: {
            select: {
              character: {
                select: { name: true, slug: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      console.timeEnd("query_products_db");

      allProductsCache = allProducts;
      allProductsCacheExpires = now + ALL_PRODUCTS_TTL;
    } else {
      console.log(`[CatalogQueryService] All Products Cache Hit.`);
    }

    // 2. Apply filtering in memory
    console.time("catalog_memory_filter_time");
    let filteredProducts = allProductsCache || [];

    if (filters) {
      if (filters.status && Object.values(ProductStatus).includes(filters.status as ProductStatus)) {
        filteredProducts = filteredProducts.filter((p) => p.status === filters.status);
      }
      if (filters.category) {
        filteredProducts = filteredProducts.filter((p) => p.category?.slug === filters.category);
      }
      if (filters.collection) {
        filteredProducts = filteredProducts.filter((p) => p.collection?.slug === filters.collection);
      }
      if (filters.character) {
        filteredProducts = filteredProducts.filter((p) => 
          p.characters?.some((c: any) => c.character?.slug === filters.character)
        );
      }
    }

    // Limit to 50 as requirement Phase 2 ("keep take: 50")
    filteredProducts = filteredProducts.slice(0, 50);

    const result = filteredProducts.map((p: any) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      imageUrl: p.imageUrl,
      character: p.characters?.[0]?.character?.name,
      line: p.collection?.name,
      status: p.status,
    }));
    console.timeEnd("catalog_memory_filter_time");

    const totalTime = performance.now() - startTotal;
    console.log(`[CatalogQueryService] catalog_total_request_time (Products): ${totalTime.toFixed(2)}ms`);

    return result;
  }

  async getCatalogMetadata(): Promise<CatalogMetadataDTO> {
    const now = Date.now();

    const startTotal = performance.now();

    if (metadataCache && metadataCache.expires > now) {
      console.log(`[CatalogQueryService] Metadata Cache Hit`);
      return metadataCache.filters;
    }

    console.log(`[CatalogQueryService] Metadata Cache Miss. Fetching from DB...`);

    const baseWhere: any = {
      deletedAt: null,
      status: {
        in: [ProductStatus.PUBLISHED, ProductStatus.PRE_ORDER],
      },
    };

    // Phase 1: Parallelize Metadata Queries
    console.time("catalog_db_parallel_queries");
    const [
      categoriesDb,
      collectionsDb,
      charactersDb,
      categoryCountsDb,
      collectionCountsDb,
      characterCountsDb
    ] = await Promise.all([
      prisma.category.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, slug: true, imageUrl: true },
        orderBy: { name: "asc" },
      }),
      prisma.collection.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, slug: true },
        orderBy: { name: "asc" },
      }),
      prisma.character.findMany({
        select: { id: true, name: true, slug: true },
        orderBy: { name: "asc" },
      }),
      prisma.product.groupBy({
        by: ["categoryId"],
        where: baseWhere,
        _count: { _all: true },
      }),
      prisma.product.groupBy({
        by: ["collectionId"],
        where: baseWhere,
        _count: { _all: true },
      }),
      prisma.productCharacter.groupBy({
        by: ["characterId"],
        where: {
          product: baseWhere,
        },
        _count: { _all: true },
      })
    ]);
    console.timeEnd("catalog_db_parallel_queries");

    const categoryMap = new Map(
      categoryCountsDb.map(
        (c: { categoryId: string | null; _count: { _all: number } }) => [
          c.categoryId,
          c._count._all,
        ],
      ),
    );

    const collectionMap = new Map(
      collectionCountsDb.map(
        (c: { collectionId: string | null; _count: { _all: number } }) => [
          c.collectionId,
          c._count._all,
        ],
      ),
    );

    const characterMap = new Map(
      characterCountsDb.map(
        (c: { characterId: string | null; _count: { _all: number } }) => [
          c.characterId,
          c._count._all,
        ],
      ),
    );

    const filters = {
      categories: categoriesDb.map((c: any) => ({
        ...c,
        count: categoryMap.get(c.id) ?? 0,
      })),
      collections: collectionsDb.map((c: any) => ({
        ...c,
        count: collectionMap.get(c.id) ?? 0,
      })),
      characters: charactersDb.map((c: any) => ({
        ...c,
        count: characterMap.get(c.id) ?? 0,
      })),
    };

    metadataCache = { filters, expires: now + METADATA_TTL };

    const totalTime = performance.now() - startTotal;
    console.log(`[CatalogQueryService] catalog_total_request_time (Metadata): ${totalTime.toFixed(2)}ms`);

    return filters;
  }
}
