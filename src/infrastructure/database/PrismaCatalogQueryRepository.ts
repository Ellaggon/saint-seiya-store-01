import type { Prisma, ProductStatus as PrismaProductStatus } from "@prisma/client";
import { ProductStatus } from "@/domain/entities/Product";
import type {
  CatalogMetadataDTO,
  CatalogProductDTO,
  CatalogProductsResponseDTO,
} from "@/application/dto/catalog.dto";
import type { CatalogQueryRepository } from "@/application/repositories/CatalogQueryRepository";
import type {
  CatalogSort,
  ProductFilters,
} from "@/domain/repositories/ProductRepository";
import { prisma } from "./prisma";

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;
const DEFAULT_SORT: CatalogSort = "created-desc";

type CatalogProductRecord = {
  id: string;
  name: string;
  price: unknown;
  imageUrl: string | null;
  status: ProductStatus;
  collection: { name: string; slug: string } | null;
  characters: {
    character: { name: string; slug: string };
  }[];
};

const toPrismaProductStatus = (
  status: ProductStatus,
): PrismaProductStatus => status;

const publishedCatalogStatuses = [
  toPrismaProductStatus(ProductStatus.PUBLISHED),
  toPrismaProductStatus(ProductStatus.PRE_ORDER),
];

const toPositiveInt = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const normalized = Math.trunc(parsed);
  return normalized > 0 ? normalized : fallback;
};

const resolveSort = (sort?: string): CatalogSort => {
  const allowed: CatalogSort[] = [
    "created-desc",
    "price-asc",
    "price-desc",
    "name-asc",
  ];
  return allowed.includes(sort as CatalogSort)
    ? (sort as CatalogSort)
    : DEFAULT_SORT;
};

const buildOrderBy = (sort: CatalogSort): Prisma.ProductOrderByWithRelationInput[] => {
  if (sort === "price-asc") return [{ price: "asc" }, { createdAt: "desc" }];
  if (sort === "price-desc") return [{ price: "desc" }, { createdAt: "desc" }];
  if (sort === "name-asc") return [{ name: "asc" }, { createdAt: "desc" }];
  return [{ createdAt: "desc" }];
};

const buildWhereClause = (
  filters?: ProductFilters,
): Prisma.ProductWhereInput => {
  const whereClause: Prisma.ProductWhereInput = {
    deletedAt: null,
    status: {
      in: publishedCatalogStatuses,
    },
  };

  if (
    filters?.status &&
    Object.values(ProductStatus).includes(filters.status as ProductStatus)
  ) {
    whereClause.status = toPrismaProductStatus(filters.status as ProductStatus);
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

  return whereClause;
};

const toCatalogProductDTO = (product: CatalogProductRecord): CatalogProductDTO => ({
  id: product.id,
  name: product.name,
  price: Number(product.price),
  imageUrl: product.imageUrl,
  character: product.characters[0]?.character.name,
  line: product.collection?.name,
  status: product.status,
});

export class PrismaCatalogQueryRepository implements CatalogQueryRepository {
  async listCatalogProducts(
    filters?: ProductFilters,
  ): Promise<CatalogProductsResponseDTO> {
    const page = toPositiveInt(filters?.page, 1);
    const requestedPageSize = toPositiveInt(filters?.pageSize, DEFAULT_PAGE_SIZE);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, requestedPageSize || DEFAULT_PAGE_SIZE),
    );
    const sort = resolveSort(filters?.sort);
    const whereClause = buildWhereClause(filters);

    const total = await prisma.product.count({ where: whereClause });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const products = await prisma.product.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        price: true,
        imageUrl: true,
        status: true,
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
      orderBy: buildOrderBy(sort),
      skip: (safePage - 1) * pageSize,
      take: pageSize,
    });

    return {
      items: products.map((product) =>
        toCatalogProductDTO({
          ...product,
          status: product.status as ProductStatus,
        }),
      ),
      pagination: {
        page: safePage,
        pageSize,
        total,
        totalPages,
      },
      sort,
    };
  }

  async getCatalogMetadata(): Promise<CatalogMetadataDTO> {
    const baseWhere = buildWhereClause();

    const categoriesDb = await prisma.category.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    });
    const collectionsDb = await prisma.collection.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    });
    const charactersDb = await prisma.character.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    });
    const categoryCountsDb = await prisma.product.groupBy({
      by: ["categoryId"],
      where: baseWhere,
      _count: { _all: true },
    });
    const collectionCountsDb = await prisma.product.groupBy({
      by: ["collectionId"],
      where: baseWhere,
      _count: { _all: true },
    });
    const characterCountsDb = await prisma.productCharacter.groupBy({
      by: ["characterId"],
      where: {
        product: baseWhere,
      },
      _count: { _all: true },
    });

    const categoryMap = new Map(
      categoryCountsDb.map((item) => [item.categoryId, item._count._all]),
    );

    const collectionMap = new Map(
      collectionCountsDb.map((item) => [item.collectionId, item._count._all]),
    );

    const characterMap = new Map(
      characterCountsDb.map((item) => [item.characterId, item._count._all]),
    );

    return {
      categories: categoriesDb.map((category) => ({
        ...category,
        count: categoryMap.get(category.id) ?? 0,
      })),
      collections: collectionsDb.map((collection) => ({
        ...collection,
        count: collectionMap.get(collection.id) ?? 0,
      })),
      characters: charactersDb.map((character) => ({
        ...character,
        count: characterMap.get(character.id) ?? 0,
      })),
    };
  }
}
