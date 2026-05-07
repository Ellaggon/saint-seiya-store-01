import { prisma } from "@/infrastructure/database/prisma";
import { ProductStatus } from "@/domain/entities/Product";
import type {
  CatalogSort,
  ProductFilters,
} from "@/domain/repositories/ProductRepository";
import type {
  CatalogMetadataDTO,
  CatalogProductDTO,
  CatalogProductsResponseDTO,
} from "@/application/dto/catalog.dto";

interface CachedMetadata {
  filters: CatalogMetadataDTO;
  expires: number;
}

const METADATA_TTL = 10 * 60 * 1000; // 10 minutes

let metadataCache: CachedMetadata | null = null;

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;
const DEFAULT_SORT: CatalogSort = "created-desc";

export class CatalogQueryService {
  private resolveSort(sort?: string): CatalogSort {
    const allowed: CatalogSort[] = [
      "created-desc",
      "price-asc",
      "price-desc",
      "name-asc",
    ];
    return allowed.includes(sort as CatalogSort)
      ? (sort as CatalogSort)
      : DEFAULT_SORT;
  }

  private buildOrderBy(sort: CatalogSort) {
    if (sort === "price-asc")
      return [{ price: "asc" as const }, { createdAt: "desc" as const }];
    if (sort === "price-desc")
      return [{ price: "desc" as const }, { createdAt: "desc" as const }];
    if (sort === "name-asc")
      return [{ name: "asc" as const }, { createdAt: "desc" as const }];
    return [{ createdAt: "desc" as const }];
  }

  async getCatalogProducts(
    filters?: ProductFilters,
  ): Promise<CatalogProductsResponseDTO> {
    const startTotal = performance.now();

    const page = Math.max(1, Math.trunc(Number(filters?.page || 1)));
    const requestedPageSize = Math.trunc(
      Number(filters?.pageSize || DEFAULT_PAGE_SIZE),
    );
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, requestedPageSize || DEFAULT_PAGE_SIZE),
    );
    const sort = this.resolveSort(filters?.sort);

    const whereClause: any = {
      deletedAt: null,
      status: {
        in: [ProductStatus.PUBLISHED, ProductStatus.PRE_ORDER],
      },
    };

    if (
      filters?.status &&
      Object.values(ProductStatus).includes(filters.status as ProductStatus)
    ) {
      whereClause.status = filters.status;
    }
    if (filters?.category) {
      whereClause.category = { slug: filters.category };
    }
    if (filters?.collection) {
      whereClause.collection = { slug: filters.collection };
    }
    if (filters?.character) {
      whereClause.characters = {
        some: {
          character: { slug: filters.character },
        },
      };
    }

    console.time("catalog_products_db_query");
    const [total, products] = await Promise.all([
      prisma.product.count({ where: whereClause }),
      prisma.product.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          price: true,
          imageUrl: true,
          status: true,
          createdAt: true,
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
        orderBy: this.buildOrderBy(sort),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    console.timeEnd("catalog_products_db_query");

    const result: CatalogProductDTO[] = products.map((p: any) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      imageUrl: p.imageUrl,
      character: p.characters?.[0]?.character?.name,
      line: p.collection?.name,
      status: p.status,
    }));
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const totalTime = performance.now() - startTotal;
    console.log(`[CatalogQueryService] catalog_total_request_time (Products): ${totalTime.toFixed(2)}ms`);
    return {
      items: result,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
      sort,
    };
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
