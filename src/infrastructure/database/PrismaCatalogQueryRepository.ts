import type {
  ProductStatus as PrismaProductStatus,
  PreorderCampaignStatus as PrismaPreorderCampaignStatus,
  PreorderDepositType as PrismaPreorderDepositType,
  PreorderReservationStatus as PrismaPreorderReservationStatus,
} from "@prisma/client";
import { Prisma } from "@prisma/client";
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

type CatalogProductRawRecord = {
  id: string;
  name: string;
  price: unknown;
  imageUrl: string | null;
  stock: number;
  status: ProductStatus;
  collectionName: string | null;
  collectionSlug: string | null;
  characterName: string | null;
  characterSlug: string | null;
  campaignId: string | null;
  campaignStatus: PrismaPreorderCampaignStatus | null;
  totalSlots: number | null;
  depositType: PrismaPreorderDepositType | null;
  depositValue: unknown | null;
  opensAt: Date | null;
  closesAt: Date | null;
  releaseDate: Date | null;
  etaStart: Date | null;
  etaEnd: Date | null;
  etaLabel: string | null;
  reservedUnits: number | bigint | null;
  totalCount: number | bigint;
};

type CatalogMetadataRawRecord = {
  categories: unknown;
  collections: unknown;
  characters: unknown;
};

type CatalogMetadataItem = {
  id: string;
  name: string;
  slug: string;
  count: number | bigint | null;
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

const buildRawOrderBy = (sort: CatalogSort): Prisma.Sql => {
  if (sort === "price-asc") {
    return Prisma.sql`p.price ASC, p."createdAt" DESC`;
  }
  if (sort === "price-desc") {
    return Prisma.sql`p.price DESC, p."createdAt" DESC`;
  }
  if (sort === "name-asc") {
    return Prisma.sql`p.name ASC, p."createdAt" DESC`;
  }
  return Prisma.sql`p."createdAt" DESC`;
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

const buildRawWhereClause = (
  filters?: ProductFilters,
  now: Date = new Date(),
): Prisma.Sql => {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`p."deletedAt" IS NULL`,
  ];
  const showSoldOut = filters?.showSoldOut === true;
  const availability = filters?.availability;
  const baseStatuses = showSoldOut
    ? [...publishedCatalogStatuses, toPrismaProductStatus(ProductStatus.OUT_OF_STOCK)]
    : publishedCatalogStatuses;

  if (availability === "available") {
    conditions.push(
      Prisma.sql`p.status = ${toPrismaProductStatus(ProductStatus.PUBLISHED)}::"ProductStatus"`,
      Prisma.sql`p.stock > 0`,
      Prisma.sql`NOT EXISTS (
        SELECT 1
        FROM "PreorderCampaign" availability_campaign
        WHERE availability_campaign."productId" = p.id
          AND availability_campaign."deletedAt" IS NULL
          AND availability_campaign.status = 'ACTIVE'::"PreorderCampaignStatus"
          AND (availability_campaign."opensAt" IS NULL OR availability_campaign."opensAt" <= ${now})
          AND (availability_campaign."closesAt" IS NULL OR availability_campaign."closesAt" >= ${now})
      )`,
    );
  } else if (availability === "preorder-open") {
    conditions.push(
      Prisma.sql`p.status = ${toPrismaProductStatus(ProductStatus.PRE_ORDER)}::"ProductStatus"`,
      Prisma.sql`EXISTS (
        SELECT 1
        FROM "PreorderCampaign" availability_campaign
        WHERE availability_campaign."productId" = p.id
          AND availability_campaign."deletedAt" IS NULL
          AND availability_campaign.status = 'ACTIVE'::"PreorderCampaignStatus"
          AND (availability_campaign."opensAt" IS NULL OR availability_campaign."opensAt" <= ${now})
          AND (availability_campaign."closesAt" IS NULL OR availability_campaign."closesAt" >= ${now})
      )`,
    );
  } else if (availability === "out-of-stock") {
    conditions.push(
      Prisma.sql`(
        p.status = ${toPrismaProductStatus(ProductStatus.OUT_OF_STOCK)}::"ProductStatus"
        OR (
          p.status = ${toPrismaProductStatus(ProductStatus.PUBLISHED)}::"ProductStatus"
          AND p.stock <= 0
        )
      )`,
    );
  } else {
    if (
      filters?.status &&
      Object.values(ProductStatus).includes(filters.status as ProductStatus)
    ) {
      conditions.push(
        Prisma.sql`p.status = ${toPrismaProductStatus(filters.status as ProductStatus)}::"ProductStatus"`,
      );
    } else {
      conditions.push(
        Prisma.sql`p.status IN (${Prisma.join(
          baseStatuses.map((status) => Prisma.sql`${status}::"ProductStatus"`),
        )})`,
      );
    }

    if (filters?.openPreorders || filters?.sort === "eta-asc") {
      conditions.push(
        Prisma.sql`EXISTS (
          SELECT 1
          FROM "PreorderCampaign" availability_campaign
          WHERE availability_campaign."productId" = p.id
            AND availability_campaign."deletedAt" IS NULL
            AND availability_campaign.status = 'ACTIVE'::"PreorderCampaignStatus"
            AND (availability_campaign."opensAt" IS NULL OR availability_campaign."opensAt" <= ${now})
            AND (availability_campaign."closesAt" IS NULL OR availability_campaign."closesAt" >= ${now})
        )`,
      );
    }
  }

  const search = filters?.q?.trim();
  if (search) {
    conditions.push(
      Prisma.sql`(
        p.name ILIKE ${`%${search}%`}
        OR collection.name ILIKE ${`%${search}%`}
        OR category.name ILIKE ${`%${search}%`}
        OR EXISTS (
          SELECT 1
          FROM "ProductCharacter" search_pc
          INNER JOIN "Character" search_character
            ON search_character.id = search_pc."characterId"
          WHERE search_pc."productId" = p.id
            AND search_character.name ILIKE ${`%${search}%`}
        )
      )`,
    );
  }

  const minPrice = toPositiveMoney(filters?.minPrice);
  const maxPrice = toPositiveMoney(filters?.maxPrice);
  if (minPrice !== undefined) conditions.push(Prisma.sql`p.price >= ${minPrice}`);
  if (maxPrice !== undefined) conditions.push(Prisma.sql`p.price <= ${maxPrice}`);

  if (filters?.category) {
    conditions.push(Prisma.sql`category.slug = ${filters.category}`);
  }

  if (filters?.collection) {
    conditions.push(Prisma.sql`collection.slug = ${filters.collection}`);
  }

  if (filters?.character) {
    conditions.push(
      Prisma.sql`EXISTS (
        SELECT 1
        FROM "ProductCharacter" filter_pc
        INNER JOIN "Character" filter_character
          ON filter_character.id = filter_pc."characterId"
        WHERE filter_pc."productId" = p.id
          AND filter_character.slug = ${filters.character}
      )`,
    );
  }

  return Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;
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

const toNumber = (value: number | bigint | null | undefined): number =>
  value === null || value === undefined ? 0 : Number(value);

const toCatalogProductDTOFromRaw = (
  product: CatalogProductRawRecord,
): CatalogProductDTO => {
  const price = Number(product.price);
  const campaign =
    product.campaignId && product.depositType
      ? {
          id: product.campaignId,
          totalSlots: product.totalSlots ?? 0,
          depositType: product.depositType,
          depositValue: product.depositValue,
          etaLabel: product.etaLabel,
          etaStart: product.etaStart,
          releaseDate: product.releaseDate,
        }
      : null;
  const reservedUnits = toNumber(product.reservedUnits);
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
    character: product.characterName ?? undefined,
    line: product.collectionName ?? undefined,
    status: product.status,
    displayAvailability: resolveDisplayAvailability({
      status: product.status,
      stock: product.stock,
      preorder,
    }),
    preorder,
  };
};

const isCatalogMetadataItem = (value: unknown): value is CatalogMetadataItem => {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.slug === "string"
  );
};

const normalizeMetadataItems = (items: unknown) =>
  Array.isArray(items)
    ? items.filter(isCatalogMetadataItem).map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        count: toNumber(item.count),
      }))
    : [];

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

const listCatalogProductRows = (
  rawWhereClause: Prisma.Sql,
  sort: CatalogSort,
  now: Date,
  skip: number,
  take: number,
): Promise<CatalogProductRawRecord[]> =>
  prisma.$queryRaw<CatalogProductRawRecord[]>`
    SELECT
      p.id,
      p.name,
      p.price,
      p."imageUrl",
      p.stock,
      p.status,
      collection.name AS "collectionName",
      collection.slug AS "collectionSlug",
      primary_character.name AS "characterName",
      primary_character.slug AS "characterSlug",
      primary_campaign.id AS "campaignId",
      primary_campaign.status AS "campaignStatus",
      primary_campaign."totalSlots",
      primary_campaign."depositType",
      primary_campaign."depositValue",
      primary_campaign."opensAt",
      primary_campaign."closesAt",
      primary_campaign."releaseDate",
      primary_campaign."etaStart",
      primary_campaign."etaEnd",
      primary_campaign."etaLabel",
      primary_campaign."reservedUnits",
      COUNT(*) OVER()::int AS "totalCount"
    FROM "Product" p
    INNER JOIN "Category" category
      ON category.id = p."categoryId"
    INNER JOIN "Collection" collection
      ON collection.id = p."collectionId"
    LEFT JOIN LATERAL (
      SELECT character.name, character.slug
      FROM "ProductCharacter" product_character
      INNER JOIN "Character" character
        ON character.id = product_character."characterId"
      WHERE product_character."productId" = p.id
      ORDER BY character.name ASC
      LIMIT 1
    ) primary_character ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        campaign.id,
        campaign.status,
        campaign."totalSlots",
        campaign."depositType",
        campaign."depositValue",
        campaign."opensAt",
        campaign."closesAt",
        campaign."releaseDate",
        campaign."etaStart",
        campaign."etaEnd",
        campaign."etaLabel",
        COALESCE(reserved_units.quantity, 0)::int AS "reservedUnits"
      FROM "PreorderCampaign" campaign
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(reservation.quantity), 0)::int AS quantity
        FROM "PreorderReservation" reservation
        WHERE reservation."campaignId" = campaign.id
          AND reservation.status IN (${Prisma.join(
            activeReservationStatuses.map(
              (status) => Prisma.sql`${status}::"PreorderReservationStatus"`,
            ),
          )})
      ) reserved_units ON TRUE
      WHERE campaign."productId" = p.id
        AND campaign."deletedAt" IS NULL
        AND campaign.status = 'ACTIVE'::"PreorderCampaignStatus"
        AND (campaign."opensAt" IS NULL OR campaign."opensAt" <= ${now})
        AND (campaign."closesAt" IS NULL OR campaign."closesAt" >= ${now})
      ORDER BY
        campaign."etaStart" ASC NULLS LAST,
        campaign."releaseDate" ASC NULLS LAST,
        campaign."etaEnd" ASC NULLS LAST,
        campaign."createdAt" DESC
      LIMIT 1
    ) primary_campaign ON TRUE
    ${rawWhereClause}
    ORDER BY ${buildRawOrderBy(sort)}
    OFFSET ${skip}
    LIMIT ${take}
  `;

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

    const requestedSkip = (page - 1) * pageSize;
    const rawWhereClause = buildRawWhereClause(filters, now);
    const rows = await listCatalogProductRows(
      rawWhereClause,
      sort,
      now,
      requestedSkip,
      pageSize,
    );
    const total = toNumber(rows[0]?.totalCount);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const products =
      safePage === page
        ? rows
        : await listCatalogProductRows(
            rawWhereClause,
            sort,
            now,
            (safePage - 1) * pageSize,
            pageSize,
          );

    return {
      items: products.map(toCatalogProductDTOFromRaw),
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
    const [metadata] = await prisma.$queryRaw<CatalogMetadataRawRecord[]>`
      WITH catalog_products AS (
        SELECT p.id, p."categoryId", p."collectionId"
        FROM "Product" p
        WHERE p."deletedAt" IS NULL
          AND p.status IN (${Prisma.join(
            publishedCatalogStatuses.map(
              (status) => Prisma.sql`${status}::"ProductStatus"`,
            ),
          )})
      ),
      category_counts AS (
        SELECT "categoryId", COUNT(*)::int AS count
        FROM catalog_products
        GROUP BY "categoryId"
      ),
      collection_counts AS (
        SELECT "collectionId", COUNT(*)::int AS count
        FROM catalog_products
        GROUP BY "collectionId"
      ),
      character_counts AS (
        SELECT pc."characterId", COUNT(*)::int AS count
        FROM "ProductCharacter" pc
        INNER JOIN catalog_products cp
          ON cp.id = pc."productId"
        GROUP BY pc."characterId"
      )
      SELECT
        COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', category.id,
              'name', category.name,
              'slug', category.slug,
              'count', COALESCE(category_counts.count, 0)
            )
            ORDER BY category.name ASC
          )
          FROM "Category" category
          LEFT JOIN category_counts
            ON category_counts."categoryId" = category.id
          WHERE category."deletedAt" IS NULL
        ), '[]'::jsonb) AS categories,
        COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', collection.id,
              'name', collection.name,
              'slug', collection.slug,
              'count', COALESCE(collection_counts.count, 0)
            )
            ORDER BY collection.name ASC
          )
          FROM "Collection" collection
          LEFT JOIN collection_counts
            ON collection_counts."collectionId" = collection.id
          WHERE collection."deletedAt" IS NULL
        ), '[]'::jsonb) AS collections,
        COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', character.id,
              'name', character.name,
              'slug', character.slug,
              'count', COALESCE(character_counts.count, 0)
            )
            ORDER BY character.name ASC
          )
          FROM "Character" character
          LEFT JOIN character_counts
            ON character_counts."characterId" = character.id
        ), '[]'::jsonb) AS characters
    `;

    return {
      categories: normalizeMetadataItems(metadata?.categories),
      collections: normalizeMetadataItems(metadata?.collections),
      characters: normalizeMetadataItems(metadata?.characters),
    };
  }
}
