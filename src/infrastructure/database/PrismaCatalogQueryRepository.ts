import type {
  Prisma,
  ProductStatus as PrismaProductStatus,
  PreorderCampaignStatus as PrismaPreorderCampaignStatus,
  PreorderDepositType as PrismaPreorderDepositType,
  PreorderReservationStatus as PrismaPreorderReservationStatus,
} from "@prisma/client";
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
import { resolveDisplayAvailability } from "@/shared/catalog/displayAvailability";
import { prisma } from "./prisma";

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;
const DEFAULT_SORT: CatalogSort = "created-desc";

type CatalogProductRecord = {
  id: string;
  name: string;
  price: unknown;
  imageUrl: string | null;
  stock: number;
  status: ProductStatus;
  collection: { name: string; slug: string } | null;
  characters: {
    character: { name: string; slug: string };
  }[];
  preorderCampaigns: {
    id: string;
    status: PrismaPreorderCampaignStatus;
    totalSlots: number;
    depositType: PrismaPreorderDepositType;
    depositValue: unknown;
    opensAt: Date | null;
    closesAt: Date | null;
    releaseDate: Date | null;
    etaStart: Date | null;
    etaEnd: Date | null;
    etaLabel: string | null;
    reservations: {
      quantity: number;
      status: PrismaPreorderReservationStatus;
    }[];
  }[];
};

const toPrismaProductStatus = (
  status: ProductStatus,
): PrismaProductStatus => status;

const publishedCatalogStatuses = [
  toPrismaProductStatus(ProductStatus.PUBLISHED),
  toPrismaProductStatus(ProductStatus.PRE_ORDER),
];

const activeReservationStatuses: PrismaPreorderReservationStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PARTIALLY_PAID",
  "PAID",
];

const toPositiveInt = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const normalized = Math.trunc(parsed);
  return normalized > 0 ? normalized : fallback;
};

const toPositiveMoney = (value: unknown): number | undefined => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed >= 0 ? parsed : undefined;
};

const resolveSort = (sort?: string): CatalogSort => {
  const allowed: CatalogSort[] = [
    "created-desc",
    "price-asc",
    "price-desc",
    "name-asc",
    "eta-asc",
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

const buildOpenCampaignWhere = (
  now: Date,
): Prisma.PreorderCampaignWhereInput => ({
  deletedAt: null,
  status: "ACTIVE",
  OR: [{ opensAt: null }, { opensAt: { lte: now } }],
  AND: [{ OR: [{ closesAt: null }, { closesAt: { gte: now } }] }],
});

const buildWhereClause = (
  filters?: ProductFilters,
): Prisma.ProductWhereInput => {
  const showSoldOut = filters?.showSoldOut === true;
  const availability = filters?.availability;
  const whereClause: Prisma.ProductWhereInput = {
    deletedAt: null,
    status: {
      in: showSoldOut
        ? [
            ...publishedCatalogStatuses,
            toPrismaProductStatus(ProductStatus.OUT_OF_STOCK),
          ]
        : publishedCatalogStatuses,
    },
  };

  if (availability === "available") {
    whereClause.status = toPrismaProductStatus(ProductStatus.PUBLISHED);
    whereClause.stock = { gt: 0 };
    whereClause.preorderCampaigns = {
      none: buildOpenCampaignWhere(new Date()),
    };
  } else if (availability === "preorder-open") {
    whereClause.status = toPrismaProductStatus(ProductStatus.PRE_ORDER);
    whereClause.preorderCampaigns = {
      some: buildOpenCampaignWhere(new Date()),
    };
  } else if (availability === "out-of-stock") {
    whereClause.OR = [
      { status: toPrismaProductStatus(ProductStatus.OUT_OF_STOCK) },
      {
        status: toPrismaProductStatus(ProductStatus.PUBLISHED),
        stock: { lte: 0 },
      },
    ];
  }

  if (
    !availability &&
    filters?.status &&
    Object.values(ProductStatus).includes(filters.status as ProductStatus)
  ) {
    whereClause.status = toPrismaProductStatus(filters.status as ProductStatus);
  }

  if (!availability && (filters?.openPreorders || filters?.sort === "eta-asc")) {
    whereClause.preorderCampaigns = {
      some: buildOpenCampaignWhere(new Date()),
    };
  }

  const search = filters?.q?.trim();
  if (search) {
    const searchClause: Prisma.ProductWhereInput = {
      OR: [
      { name: { contains: search, mode: "insensitive" } },
      { collection: { name: { contains: search, mode: "insensitive" } } },
      { category: { name: { contains: search, mode: "insensitive" } } },
      {
        characters: {
          some: {
            character: { name: { contains: search, mode: "insensitive" } },
          },
        },
      },
      ],
    };

    if (whereClause.OR) {
      const existingOr = whereClause.OR;
      delete whereClause.OR;
      whereClause.AND = [{ OR: existingOr }, searchClause];
    } else {
      whereClause.AND = [
        ...(Array.isArray(whereClause.AND) ? whereClause.AND : []),
        searchClause,
      ];
    }
  }

  const minPrice = toPositiveMoney(filters?.minPrice);
  const maxPrice = toPositiveMoney(filters?.maxPrice);
  if (minPrice !== undefined || maxPrice !== undefined) {
    whereClause.price = {
      ...(minPrice !== undefined ? { gte: minPrice } : {}),
      ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
    };
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

const calculateDepositAmount = (
  price: number,
  depositType: PrismaPreorderDepositType,
  depositValue: unknown,
): number => {
  const value = Number(depositValue);
  if (!Number.isFinite(value)) return 0;
  if (depositType === "FULL") return price;
  if (depositType === "FIXED") return Math.min(value, price);
  return Math.min(price * (value / 100), price);
};

const campaignDateValue = (
  campaign: CatalogProductRecord["preorderCampaigns"][number],
): number => {
  const value =
    campaign.etaStart?.getTime() ??
    campaign.releaseDate?.getTime() ??
    campaign.etaEnd?.getTime();
  return value ?? Number.MAX_SAFE_INTEGER;
};

const selectPrimaryCampaign = (
  campaigns: CatalogProductRecord["preorderCampaigns"],
) =>
  [...campaigns].sort((a, b) => campaignDateValue(a) - campaignDateValue(b))[0];

const toCatalogProductDTO = (product: CatalogProductRecord): CatalogProductDTO => {
  const price = Number(product.price);
  const campaign = selectPrimaryCampaign(product.preorderCampaigns);
  const reservedUnits =
    campaign?.reservations.reduce((total, reservation) => {
      if (!activeReservationStatuses.includes(reservation.status)) {
        return total;
      }
      return total + reservation.quantity;
    }, 0) ?? 0;
  const availableUnits = campaign
    ? Math.max(campaign.totalSlots - reservedUnits, 0)
    : 0;

  const preorder = campaign
    ? {
        campaignId: campaign.id,
        etaLabel: campaign.etaLabel,
        etaStart: campaign.etaStart?.toISOString() ?? null,
        releaseDate: campaign.releaseDate?.toISOString() ?? null,
        availableUnits,
        totalUnits: campaign.totalSlots,
        depositAmount: calculateDepositAmount(
          price,
          campaign.depositType,
          campaign.depositValue,
        ),
        isOpen: availableUnits > 0,
      }
    : undefined;

  return {
    id: product.id,
    name: product.name,
    price,
    imageUrl: product.imageUrl,
    character: product.characters[0]?.character.name,
    line: product.collection?.name,
    status: product.status,
    displayAvailability: resolveDisplayAvailability({
      status: product.status,
      stock: product.stock,
      preorder,
    }),
    preorder,
  };
};

const productSelect = (
  now: Date,
): Prisma.ProductSelect => ({
  id: true,
  name: true,
  price: true,
  imageUrl: true,
  stock: true,
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
  preorderCampaigns: {
    where: buildOpenCampaignWhere(now),
    select: {
      id: true,
      status: true,
      totalSlots: true,
      depositType: true,
      depositValue: true,
      opensAt: true,
      closesAt: true,
      releaseDate: true,
      etaStart: true,
      etaEnd: true,
      etaLabel: true,
      reservations: {
        where: {
          status: { in: activeReservationStatuses },
        },
        select: {
          quantity: true,
          status: true,
        },
      },
    },
  },
});

export class PrismaCatalogQueryRepository implements CatalogQueryRepository {
  async listCatalogProducts(
    filters?: ProductFilters,
  ): Promise<CatalogProductsResponseDTO> {
    const now = new Date();
    const page = toPositiveInt(filters?.page, 1);
    const requestedPageSize = toPositiveInt(filters?.pageSize, DEFAULT_PAGE_SIZE);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, requestedPageSize || DEFAULT_PAGE_SIZE),
    );
    const sort = resolveSort(filters?.sort);
    const whereClause = buildWhereClause(filters);

    if (sort === "eta-asc") {
      const campaigns = await prisma.preorderCampaign.findMany({
        where: {
          ...buildOpenCampaignWhere(now),
          product: whereClause,
        },
        select: {
          productId: true,
        },
        orderBy: [
          { etaStart: { sort: "asc", nulls: "last" } },
          { releaseDate: { sort: "asc", nulls: "last" } },
          { createdAt: "desc" },
        ],
      });
      const orderedProductIds = [
        ...new Set(campaigns.map((campaign) => campaign.productId)),
      ];
      const total = orderedProductIds.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const safePage = Math.min(page, totalPages);
      const pageIds = orderedProductIds.slice(
        (safePage - 1) * pageSize,
        safePage * pageSize,
      );
      const products = pageIds.length
        ? await prisma.product.findMany({
            where: { id: { in: pageIds } },
            select: productSelect(now),
          })
        : [];
      const productMap = new Map(
        products.map((product) => [
          product.id,
          product as unknown as CatalogProductRecord,
        ]),
      );

      return {
        items: pageIds
          .map((id) => productMap.get(id))
          .filter((product): product is CatalogProductRecord => Boolean(product))
          .map((product) =>
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

    const total = await prisma.product.count({ where: whereClause });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const products = await prisma.product.findMany({
      where: whereClause,
      select: productSelect(now),
      orderBy: buildOrderBy(sort),
      skip: (safePage - 1) * pageSize,
      take: pageSize,
    });

    return {
      items: products.map((product) =>
        toCatalogProductDTO({
          ...(product as unknown as CatalogProductRecord),
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
