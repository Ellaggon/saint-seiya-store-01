import {
  type Prisma,
  type PreorderCampaignStatus as PrismaCampaignStatusType,
} from "@prisma/client";

import { PreorderRepositoryError } from "@/domain/errors/PreorderRepositoryError";
import { PreorderCampaignStatus } from "@/domain/entities/PreorderCampaign";
import {
  PreorderPaymentProvider,
  PreorderPaymentStatus,
  type PreorderPayment,
} from "@/domain/entities/PreorderPayment";
import type { PreorderCampaign } from "@/domain/entities/PreorderCampaign";
import type { PreorderReservation } from "@/domain/entities/PreorderReservation";
import type {
  CreatePreorderCampaignInput,
  PreorderCampaignFilters,
  PreorderCampaignWithProduct,
  PreorderDetailLookup,
  ExpirePendingPreorderReservationsInput,
  ExpirePendingPreorderReservationsResult,
  PreorderPaginatedResult,
  PreorderProductSummary,
  PreorderRepository,
  RegisterPreorderPaymentInput,
  ReservePreorderInput,
  ReservePreorderWithPaymentDraftInput,
  ReservePreorderWithPaymentDraftResult,
  UpdatePreorderCampaignInput,
} from "@/domain/repositories/PreorderRepository";
import { PreorderPricingService } from "@/domain/services/PreorderPricingService";
import { Money } from "@/domain/value-objects/Money";

import { prisma } from "./prisma";
import {
  ACTIVE_RESERVATION_STATUSES,
  calculateReservedUnits,
  moneyToDecimal,
  paymentKindToPrisma,
  paymentProviderToPrisma,
  paymentStatusToPrisma,
  PRISMA_CAMPAIGN_STATUS,
  PRISMA_RESERVATION_STATUS,
  reservationStatusToPrisma,
  toDomainCampaign,
  toDomainPayment,
  toDomainReservation,
  toPersistenceCampaignInput,
  toPersistenceCampaignUpdateInput,
  type PrismaCampaignRecord,
} from "./mappers/preorder.mapper";

type TransactionClient = Prisma.TransactionClient;

const activeReservationWhere = {
  status: {
    in: ACTIVE_RESERVATION_STATUSES,
  },
} satisfies Prisma.PreorderReservationWhereInput;

const preorderProductSummaryInclude = {
  category: true,
  collection: true,
  characters: {
    include: {
      character: true,
    },
  },
} satisfies Prisma.ProductInclude;

/** List/read include: product summary + active reservation quantities only. */
const campaignListInclude = {
  product: {
    include: preorderProductSummaryInclude,
  },
  reservations: {
    where: activeReservationWhere,
    select: {
      quantity: true,
    },
  },
} satisfies Prisma.PreorderCampaignInclude;

const campaignDetailInclude = {
  product: {
    include: preorderProductSummaryInclude,
  },
  reservations: {
    where: activeReservationWhere,
    select: {
      id: true,
      campaignId: true,
      userId: true,
      quantity: true,
      unitPrice: true,
      totalAmount: true,
      depositRequired: true,
      status: true,
      expiresAt: true,
      confirmedAt: true,
      canceledAt: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.PreorderCampaignInclude;

type CampaignDetailRecord = Prisma.PreorderCampaignGetPayload<{
  include: typeof campaignDetailInclude;
}>;

type CampaignListRawRecord = Prisma.PreorderCampaignGetPayload<{
  include: typeof campaignListInclude;
}>;

type CampaignListRecord = Omit<CampaignListRawRecord, "reservations"> & {
  reservedUnits: number;
};

type CampaignRecordForList = CampaignDetailRecord | CampaignListRecord;

const reservationDetailInclude = {
  payments: true,
} satisfies Prisma.PreorderReservationInclude;

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;
const DEFAULT_EXPIRATION_BATCH_SIZE = 500;
const MAX_EXPIRATION_BATCH_SIZE = 1_000;

const toPositiveInt = (value: number | undefined, fallback: number): number => {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value)) return fallback;
  const normalized = Math.trunc(value);
  return normalized > 0 ? normalized : fallback;
};

const productWhere = (
  filters?: PreorderCampaignFilters,
): Prisma.ProductWhereInput | undefined => {
  const where: Prisma.ProductWhereInput = {};

  if (filters?.category) where.category = { slug: filters.category };
  if (filters?.collection) where.collection = { slug: filters.collection };
  if (filters?.character) {
    where.characters = {
      some: { character: { slug: filters.character } },
    };
  }
  if (filters?.minPrice || filters?.maxPrice) {
    where.price = {
      ...(filters.minPrice ? { gte: filters.minPrice.toNumber() } : {}),
      ...(filters.maxPrice ? { lte: filters.maxPrice.toNumber() } : {}),
    };
  }

  const search = filters?.q?.trim();
  if (search) {
    where.AND = [
      {
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
      },
    ];
  }

  return Object.keys(where).length > 0 ? where : undefined;
};

const campaignWhere = (
  filters?: PreorderCampaignFilters,
): Prisma.PreorderCampaignWhereInput => {
  const product = productWhere(filters);

  return {
    ...(filters?.includeDeleted ? {} : { deletedAt: null }),
    ...(filters?.productId ? { productId: filters.productId } : {}),
    status: mapFilterStatus(filters),
    ...(product ? { product } : {}),
    ...(filters?.etaFrom || filters?.etaTo
      ? {
          etaStart: {
            ...(filters.etaFrom ? { gte: filters.etaFrom } : {}),
            ...(filters.etaTo ? { lte: filters.etaTo } : {}),
          },
        }
      : {}),
  };
};

const mapFilterStatus = (
  filters?: PreorderCampaignFilters,
): PrismaCampaignStatusType | undefined => {
  if (filters?.status) return mapCampaignStatusToPrisma(filters.status);
  return undefined;
};

const mapCampaignStatusToPrisma = (
  status: PreorderCampaignStatus,
): PrismaCampaignStatusType => {
  const map: Record<PreorderCampaignStatus, PrismaCampaignStatusType> = {
    [PreorderCampaignStatus.DRAFT]: PRISMA_CAMPAIGN_STATUS.DRAFT,
    [PreorderCampaignStatus.ACTIVE]: PRISMA_CAMPAIGN_STATUS.ACTIVE,
    [PreorderCampaignStatus.PAUSED]: PRISMA_CAMPAIGN_STATUS.PAUSED,
    [PreorderCampaignStatus.SOLD_OUT]: PRISMA_CAMPAIGN_STATUS.SOLD_OUT,
    [PreorderCampaignStatus.ARRIVED]: PRISMA_CAMPAIGN_STATUS.ARRIVED,
    [PreorderCampaignStatus.CLOSED]: PRISMA_CAMPAIGN_STATUS.CLOSED,
    [PreorderCampaignStatus.CANCELED]: PRISMA_CAMPAIGN_STATUS.CANCELED,
  };

  return map[status];
};

const campaignOrderBy = (
  sort: PreorderCampaignFilters["sort"],
): Prisma.PreorderCampaignOrderByWithRelationInput[] => {
  if (sort === "eta-asc") return [{ etaStart: "asc" }, { createdAt: "desc" }];
  if (sort === "price-asc")
    return [{ product: { price: "asc" } }, { createdAt: "desc" }];
  if (sort === "price-desc")
    return [{ product: { price: "desc" } }, { createdAt: "desc" }];
  return [{ createdAt: "desc" }, { id: "asc" }];
};

const toProductSummary = (
  product: CampaignRecordForList["product"],
): PreorderProductSummary => ({
  id: product.id,
  name: product.name,
  slug: product.slug,
  imageUrl: product.imageUrl,
  price: Money.from(product.price.toNumber()),
  status: product.status,
  category: product.category
    ? {
        id: product.category.id,
        name: product.category.name,
        slug: product.category.slug,
      }
    : null,
  collection: product.collection
    ? {
        id: product.collection.id,
        name: product.collection.name,
        slug: product.collection.slug,
      }
    : null,
  characters: product.characters.map((entry) => ({
    id: entry.character.id,
    name: entry.character.name,
    slug: entry.character.slug,
  })),
});

const toCampaignWithProduct = (
  record: CampaignRecordForList,
): PreorderCampaignWithProduct => ({
  campaign: toDomainCampaign(record as PrismaCampaignRecord),
  product: toProductSummary(record.product),
});

const withInlineReservedUnits = (
  campaigns: CampaignListRawRecord[],
): CampaignListRecord[] =>
  campaigns.map((campaign) => {
    const reservedUnits = campaign.reservations.reduce(
      (total, reservation) => total + reservation.quantity,
      0,
    );
    const { reservations: _reservations, ...rest } = campaign;
    return {
      ...rest,
      reservedUnits,
    };
  });

const lockCampaign = async (
  tx: TransactionClient,
  campaignId: string,
): Promise<void> => {
  await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM "PreorderCampaign"
    WHERE id = ${campaignId}
    FOR UPDATE
  `;
};

const lockProduct = async (
  tx: TransactionClient,
  productId: string,
): Promise<void> => {
  await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Product"
    WHERE id = ${productId}
    FOR UPDATE
  `;
};

const lockReservation = async (
  tx: TransactionClient,
  reservationId: string,
): Promise<void> => {
  await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM "PreorderReservation"
    WHERE id = ${reservationId}
    FOR UPDATE
  `;
};

const expireStalePendingReservations = async (
  tx: TransactionClient,
  campaignId: string,
  now: Date,
): Promise<void> => {
  await tx.preorderReservation.updateMany({
    where: {
      campaignId,
      status: PRISMA_RESERVATION_STATUS.PENDING,
      expiresAt: {
        lt: now,
      },
    },
    data: {
      status: PRISMA_RESERVATION_STATUS.EXPIRED,
    },
  });
};

const expirationBatchSize = (batchSize: number | undefined): number => {
  const requested = toPositiveInt(batchSize, DEFAULT_EXPIRATION_BATCH_SIZE);
  return Math.min(MAX_EXPIRATION_BATCH_SIZE, requested);
};

const activeCampaignStatuses = [
  PRISMA_CAMPAIGN_STATUS.ACTIVE,
  PRISMA_CAMPAIGN_STATUS.PAUSED,
  PRISMA_CAMPAIGN_STATUS.SOLD_OUT,
] satisfies PrismaCampaignStatusType[];

const isActiveOperationalStatus = (
  status: PreorderCampaignStatus,
): boolean =>
  [
    PreorderCampaignStatus.ACTIVE,
    PreorderCampaignStatus.PAUSED,
    PreorderCampaignStatus.SOLD_OUT,
  ].includes(status);

const assertNoActiveCampaignForProduct = async (
  tx: TransactionClient,
  productId: string,
  excludedCampaignId?: string,
): Promise<void> => {
  const existing = await tx.preorderCampaign.findFirst({
    where: {
      productId,
      deletedAt: null,
      status: { in: activeCampaignStatuses },
      ...(excludedCampaignId ? { id: { not: excludedCampaignId } } : {}),
    },
    select: { id: true },
  });

  if (existing) {
    throw new PreorderRepositoryError(
      "DUPLICATE_ACTIVE_CAMPAIGN",
      "Product already has an active preorder campaign",
    );
  }
};

const campaignMatchesAvailability = (
  campaign: CampaignRecordForList,
  availability: PreorderCampaignFilters["availability"],
  now: Date,
): boolean => {
  if (!availability) return true;

  const domainCampaign = toDomainCampaign(campaign);
  const isPublic =
    !domainCampaign.deletedAt &&
    (domainCampaign.status === PreorderCampaignStatus.ACTIVE ||
      domainCampaign.status === PreorderCampaignStatus.SOLD_OUT);
  const inWindow =
    (!domainCampaign.opensAt || now >= domainCampaign.opensAt) &&
    (!domainCampaign.closesAt || now <= domainCampaign.closesAt);

  if (availability === "SOLD_OUT") {
    return isPublic && (domainCampaign.isSoldOut || domainCampaign.availableUnits <= 0);
  }

  return (
    isPublic &&
    domainCampaign.status === PreorderCampaignStatus.ACTIVE &&
    inWindow &&
    domainCampaign.availableUnits > 0
  );
};

export class PrismaPreorderRepository implements PreorderRepository {
  private readonly pricingService = new PreorderPricingService();

  async createCampaign(
    input: CreatePreorderCampaignInput,
  ): Promise<PreorderCampaign> {
    return prisma.$transaction(async (tx) => {
      await lockProduct(tx, input.campaign.productId);

      if (isActiveOperationalStatus(input.campaign.status)) {
        await assertNoActiveCampaignForProduct(tx, input.campaign.productId);
      }

      const campaign = await tx.preorderCampaign.create({
        data: toPersistenceCampaignInput(input.campaign),
        include: campaignDetailInclude,
      });

      return toDomainCampaign(campaign);
    });
  }

  async updateCampaign(
    input: UpdatePreorderCampaignInput,
  ): Promise<PreorderCampaign> {
    return prisma.$transaction(async (tx) => {
      await lockProduct(tx, input.campaign.productId);

      if (isActiveOperationalStatus(input.campaign.status)) {
        await assertNoActiveCampaignForProduct(
          tx,
          input.campaign.productId,
          input.campaign.id,
        );
      }

      const campaign = await tx.preorderCampaign.update({
        where: { id: input.campaign.id },
        data: toPersistenceCampaignUpdateInput(input.campaign),
        include: campaignDetailInclude,
      });

      return toDomainCampaign(campaign);
    });
  }

  async findCampaignById(id: string): Promise<PreorderCampaign | null> {
    const campaign = await prisma.preorderCampaign.findUnique({
      where: { id },
      include: {
        reservations: {
          where: activeReservationWhere,
          select: { quantity: true },
        },
      },
    });

    if (!campaign) return null;

    const reservedUnits = campaign.reservations.reduce(
      (total, reservation) => total + reservation.quantity,
      0,
    );

    return toDomainCampaign({
      ...campaign,
      reservedUnits,
      reservations: undefined,
    });
  }

  async findCampaignByProductId(
    productId: string,
  ): Promise<PreorderCampaign[]> {
    const campaigns = await prisma.preorderCampaign.findMany({
      where: { productId, deletedAt: null },
      include: campaignDetailInclude,
      orderBy: campaignOrderBy("created-desc"),
    });

    return campaigns.map(toDomainCampaign);
  }

  async listCampaigns(
    filters?: PreorderCampaignFilters,
  ): Promise<PreorderPaginatedResult<PreorderCampaign>> {
    const page = toPositiveInt(filters?.page, 1);
    const requestedPageSize = toPositiveInt(filters?.pageSize, DEFAULT_PAGE_SIZE);
    const pageSize = Math.min(MAX_PAGE_SIZE, requestedPageSize);
    const where = campaignWhere(filters);

    const availabilityFilteredCampaigns = filters?.availability
      ? await this.findCampaignRecordsForList(where, filters)
      : undefined;
    let total: number;
    let campaigns: CampaignRecordForList[];

    if (availabilityFilteredCampaigns) {
      total = availabilityFilteredCampaigns.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const safePage = Math.min(page, totalPages);
      campaigns = availabilityFilteredCampaigns.slice(
        (safePage - 1) * pageSize,
        safePage * pageSize,
      );

      return {
        items: campaigns.map((campaign) =>
          toDomainCampaign(campaign as PrismaCampaignRecord),
        ),
        page: safePage,
        pageSize,
        total,
        totalPages,
      };
    }

    const requestedPage = page;
    const [recordCount, requestedPageCampaigns] = await Promise.all([
      prisma.preorderCampaign.count({ where }),
      prisma.preorderCampaign.findMany({
        where,
        include: campaignListInclude,
        orderBy: campaignOrderBy(filters?.sort),
        skip: (requestedPage - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    total = recordCount;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(requestedPage, totalPages);
    const pageCampaigns =
      safePage === requestedPage
        ? requestedPageCampaigns
        : await prisma.preorderCampaign.findMany({
            where,
            include: campaignListInclude,
            orderBy: campaignOrderBy(filters?.sort),
            skip: (safePage - 1) * pageSize,
            take: pageSize,
          });
    campaigns = withInlineReservedUnits(pageCampaigns);

    return {
      items: campaigns.map((campaign) =>
        toDomainCampaign(campaign as PrismaCampaignRecord),
      ),
      page: safePage,
      pageSize,
      total,
      totalPages,
    };
  }

  async findCampaignDetail(
    lookup: PreorderDetailLookup,
  ): Promise<PreorderCampaignWithProduct | null> {
    if (!lookup.id && !lookup.productId && !lookup.productSlug) {
      return null;
    }

    // Read path only needs product summary + reserved unit count — not every
    // reservation row (admin edit / storefront detail). Keep writes on the
    // heavier campaignDetailInclude.
    const detailReadInclude = {
      product: {
        include: preorderProductSummaryInclude,
      },
      reservations: {
        where: activeReservationWhere,
        select: { quantity: true },
      },
    } satisfies Prisma.PreorderCampaignInclude;

    const campaign = lookup.id
      ? await prisma.preorderCampaign.findUnique({
          where: { id: lookup.id },
          include: detailReadInclude,
        })
      : await prisma.preorderCampaign.findFirst({
          where: {
            deletedAt: null,
            ...(lookup.productId ? { productId: lookup.productId } : {}),
            ...(lookup.productSlug
              ? { product: { slug: lookup.productSlug } }
              : {}),
          },
          include: detailReadInclude,
          orderBy: campaignOrderBy("created-desc"),
        });

    if (!campaign || campaign.deletedAt) return null;

    // `where` already limits to active statuses — sum quantities without
    // hydrating full reservation rows for status checks.
    const reservedUnits = campaign.reservations.reduce(
      (total, reservation) => total + reservation.quantity,
      0,
    );
    const { reservations: _reservations, ...rest } = campaign;

    return toCampaignWithProduct({
      ...rest,
      reservedUnits,
    });
  }

  async listCampaignsWithProducts(
    filters?: PreorderCampaignFilters,
  ): Promise<PreorderPaginatedResult<PreorderCampaignWithProduct>> {
    const result = await this.listCampaignRecords(filters);

    return {
      ...result,
      items: result.items.map(toCampaignWithProduct),
    };
  }

  private async listCampaignRecords(
    filters?: PreorderCampaignFilters,
  ): Promise<PreorderPaginatedResult<CampaignRecordForList>> {
    const page = toPositiveInt(filters?.page, 1);
    const requestedPageSize = toPositiveInt(filters?.pageSize, DEFAULT_PAGE_SIZE);
    const pageSize = Math.min(MAX_PAGE_SIZE, requestedPageSize);
    const where = campaignWhere(filters);

    const availabilityFilteredCampaigns = filters?.availability
      ? await this.findCampaignRecordsForList(where, filters)
      : undefined;
    let total: number;
    let campaigns: CampaignRecordForList[];

    if (availabilityFilteredCampaigns) {
      total = availabilityFilteredCampaigns.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const safePage = Math.min(page, totalPages);
      campaigns = availabilityFilteredCampaigns.slice(
        (safePage - 1) * pageSize,
        safePage * pageSize,
      );

      return {
        items: campaigns,
        page: safePage,
        pageSize,
        total,
        totalPages,
      };
    }

    const requestedPage = page;
    const [recordCount, requestedPageCampaigns] = await Promise.all([
      prisma.preorderCampaign.count({ where }),
      prisma.preorderCampaign.findMany({
        where,
        include: campaignListInclude,
        orderBy: campaignOrderBy(filters?.sort),
        skip: (requestedPage - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    total = recordCount;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(requestedPage, totalPages);
    const pageCampaigns =
      safePage === requestedPage
        ? requestedPageCampaigns
        : await prisma.preorderCampaign.findMany({
            where,
            include: campaignListInclude,
            orderBy: campaignOrderBy(filters?.sort),
            skip: (safePage - 1) * pageSize,
            take: pageSize,
          });
    campaigns = withInlineReservedUnits(pageCampaigns);

    return {
      items: campaigns,
      page: safePage,
      pageSize,
      total,
      totalPages,
    };
  }

  private async findCampaignRecordsForList(
    where: Prisma.PreorderCampaignWhereInput,
    filters?: PreorderCampaignFilters,
  ): Promise<CampaignRecordForList[]> {
    const campaignRecords = await prisma.preorderCampaign.findMany({
      where,
      include: campaignListInclude,
      orderBy: campaignOrderBy(filters?.sort),
    });
    const campaigns = withInlineReservedUnits(campaignRecords);

    if (!filters?.availability) return campaigns;

    const now = new Date();
    return campaigns.filter((campaign) =>
      campaignMatchesAvailability(campaign, filters.availability, now),
    );
  }

  async reserve(input: ReservePreorderInput): Promise<PreorderReservation> {
    return prisma.$transaction(async (tx) => {
      await lockCampaign(tx, input.campaignId);

      const campaign = await tx.preorderCampaign.findUnique({
        where: { id: input.campaignId },
        include: campaignDetailInclude,
      });

      if (!campaign || campaign.deletedAt) {
        throw new PreorderRepositoryError(
          "CAMPAIGN_NOT_FOUND",
          "Preorder campaign not found",
        );
      }

      await expireStalePendingReservations(tx, input.campaignId, input.requestedAt);

      const activeUserReservation = await tx.preorderReservation.findFirst({
        where: {
          campaignId: input.campaignId,
          userId: input.userId,
          ...activeReservationWhere,
        },
        select: { id: true },
      });

      if (activeUserReservation) {
        throw new PreorderRepositoryError(
          "DUPLICATE_RESERVATION",
          "User already has an active preorder reservation",
        );
      }

      const activeReservations = await tx.preorderReservation.findMany({
        where: {
          campaignId: input.campaignId,
          ...activeReservationWhere,
        },
        select: {
          id: true,
          campaignId: true,
          userId: true,
          quantity: true,
          unitPrice: true,
          totalAmount: true,
          depositRequired: true,
          status: true,
          expiresAt: true,
          confirmedAt: true,
          canceledAt: true,
          createdAt: true,
          updatedAt: true,
          payments: true,
        },
      });

      const reservedUnits = calculateReservedUnits(activeReservations);
      const domainCampaign = toDomainCampaign({
        ...campaign,
        reservations: activeReservations,
      });

      if (!domainCampaign.canReserve(input.quantity, 0, input.requestedAt)) {
        throw new PreorderRepositoryError(
          "CAMPAIGN_NOT_RESERVABLE",
          "Preorder campaign cannot accept this reservation",
        );
      }

      if (reservedUnits + input.quantity > campaign.totalSlots) {
        throw new PreorderRepositoryError(
          "SOLD_OUT",
          "Preorder campaign does not have enough available slots",
        );
      }

      const pricing = this.pricingService.calculate({
        unitPrice: input.unitPrice,
        quantity: input.quantity,
        campaign: domainCampaign,
        payInFull: input.payInFull,
      });

      const reservation = await tx.preorderReservation.create({
        data: {
          campaignId: input.campaignId,
          userId: input.userId,
          quantity: input.quantity,
          unitPrice: moneyToDecimal(input.unitPrice),
          totalAmount: moneyToDecimal(pricing.totalAmount),
          depositRequired: moneyToDecimal(pricing.depositRequired),
          status: PRISMA_RESERVATION_STATUS.PENDING,
          expiresAt: input.expiresAt ?? null,
        },
        include: reservationDetailInclude,
      });

      return toDomainReservation(reservation);
    });
  }

  async reserveWithPaymentDraft(
    input: ReservePreorderWithPaymentDraftInput,
  ): Promise<ReservePreorderWithPaymentDraftResult> {
    return prisma.$transaction(async (tx) => {
      await lockCampaign(tx, input.campaignId);

      const campaign = await tx.preorderCampaign.findUnique({
        where: { id: input.campaignId },
        include: campaignDetailInclude,
      });

      if (!campaign || campaign.deletedAt) {
        throw new PreorderRepositoryError(
          "CAMPAIGN_NOT_FOUND",
          "Preorder campaign not found",
        );
      }

      await expireStalePendingReservations(tx, input.campaignId, input.requestedAt);

      const activeUserReservation = await tx.preorderReservation.findFirst({
        where: {
          campaignId: input.campaignId,
          userId: input.userId,
          ...activeReservationWhere,
        },
        select: { id: true },
      });

      if (activeUserReservation) {
        throw new PreorderRepositoryError(
          "DUPLICATE_RESERVATION",
          "User already has an active preorder reservation",
        );
      }

      const activeReservations = await tx.preorderReservation.findMany({
        where: {
          campaignId: input.campaignId,
          ...activeReservationWhere,
        },
        select: {
          id: true,
          campaignId: true,
          userId: true,
          quantity: true,
          unitPrice: true,
          totalAmount: true,
          depositRequired: true,
          status: true,
          expiresAt: true,
          confirmedAt: true,
          canceledAt: true,
          createdAt: true,
          updatedAt: true,
          payments: true,
        },
      });

      const reservedUnits = calculateReservedUnits(activeReservations);
      const domainCampaign = toDomainCampaign({
        ...campaign,
        reservations: activeReservations,
      });

      if (!domainCampaign.canReserve(input.quantity, 0, input.requestedAt)) {
        throw new PreorderRepositoryError(
          "CAMPAIGN_NOT_RESERVABLE",
          "Preorder campaign cannot accept this reservation",
        );
      }

      if (reservedUnits + input.quantity > campaign.totalSlots) {
        throw new PreorderRepositoryError(
          "SOLD_OUT",
          "Preorder campaign does not have enough available slots",
        );
      }

      const pricing = this.pricingService.calculate({
        unitPrice: input.unitPrice,
        quantity: input.quantity,
        campaign: domainCampaign,
        payInFull: input.payInFull,
      });

      const reservation = await tx.preorderReservation.create({
        data: {
          campaignId: input.campaignId,
          userId: input.userId,
          quantity: input.quantity,
          unitPrice: moneyToDecimal(input.unitPrice),
          totalAmount: moneyToDecimal(pricing.totalAmount),
          depositRequired: moneyToDecimal(pricing.depositRequired),
          status: PRISMA_RESERVATION_STATUS.PENDING,
          expiresAt: input.expiresAt ?? null,
        },
        include: reservationDetailInclude,
      });

      const payment = await tx.preorderPayment.create({
        data: {
          reservationId: reservation.id,
          kind: paymentKindToPrisma[input.paymentKind],
          amount: moneyToDecimal(input.paymentAmount),
          status: paymentStatusToPrisma[PreorderPaymentStatus.PENDING],
          provider: paymentProviderToPrisma[PreorderPaymentProvider.QR_BANK],
          metadata: input.metadata,
          createdAt: input.paymentCreatedAt,
        },
      });

      return {
        reservation: toDomainReservation(reservation),
        payment: toDomainPayment(payment),
      };
    });
  }

  async findReservationById(id: string): Promise<PreorderReservation | null> {
    const reservation = await prisma.preorderReservation.findUnique({
      where: { id },
      include: reservationDetailInclude,
    });

    return reservation ? toDomainReservation(reservation) : null;
  }

  async listReservationsByCampaign(
    campaignId: string,
  ): Promise<PreorderReservation[]> {
    const reservations = await prisma.preorderReservation.findMany({
      where: { campaignId },
      include: reservationDetailInclude,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    return reservations.map(toDomainReservation);
  }

  async cancelReservation(
    id: string,
    userId?: string,
  ): Promise<PreorderReservation | null> {
    return prisma.$transaction(async (tx) => {
      await lockReservation(tx, id);

      const reservation = await tx.preorderReservation.findFirst({
        where: {
          id,
          ...(userId ? { userId } : {}),
        },
        include: reservationDetailInclude,
      });

      if (!reservation) {
        return null;
      }

      const domainReservation = toDomainReservation(reservation);
      const canceled = domainReservation.cancel(new Date());

      if (canceled.status === domainReservation.status) {
        return canceled;
      }

      const updated = await tx.preorderReservation.update({
        where: { id: reservation.id },
        data: {
          status: reservationStatusToPrisma[canceled.status],
          canceledAt: canceled.canceledAt,
        },
        include: reservationDetailInclude,
      });

      return toDomainReservation(updated);
    });
  }

  async markArrived(id: string): Promise<PreorderCampaign | null> {
    const existing = await prisma.preorderCampaign.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return null;
    }

    const campaign = await prisma.preorderCampaign.update({
      where: { id },
      data: { status: PRISMA_CAMPAIGN_STATUS.ARRIVED },
      include: campaignDetailInclude,
    });

    return toDomainCampaign(campaign);
  }

  async registerPayment(
    input: RegisterPreorderPaymentInput,
  ): Promise<PreorderPayment> {
    return prisma.$transaction(async (tx) => {
      await lockReservation(tx, input.reservationId);

      const reservation = await tx.preorderReservation.findUnique({
        where: { id: input.reservationId },
        include: reservationDetailInclude,
      });

      if (!reservation) {
        throw new PreorderRepositoryError(
          "RESERVATION_NOT_FOUND",
          "Preorder reservation not found",
        );
      }

      if (input.provider && input.providerPaymentId) {
        const existingPayment = await tx.preorderPayment.findUnique({
          where: {
            provider_providerPaymentId: {
              provider: paymentProviderToPrisma[input.provider],
              providerPaymentId: input.providerPaymentId,
            },
          },
        });

        if (existingPayment) {
          if (existingPayment.reservationId !== input.reservationId) {
            throw new PreorderRepositoryError(
              "DUPLICATE_PAYMENT",
              "Provider payment is already linked to another preorder reservation",
            );
          }

          return toDomainPayment(existingPayment);
        }
      }

      const domainReservation = toDomainReservation(reservation);
      let nextReservation: PreorderReservation | null = null;
      if (input.status === PreorderPaymentStatus.PAID) {
        try {
          nextReservation = domainReservation.confirmPayment(
            input.amount,
            input.paidAt ?? input.createdAt,
          );
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Invalid preorder payment";
          const normalized = message.toLowerCase();

          if (normalized.includes("exceed")) {
            throw new PreorderRepositoryError(
              "PAYMENT_EXCEEDS_BALANCE",
              message,
            );
          }

          if (normalized.includes("inactive")) {
            throw new PreorderRepositoryError(
              "INVALID_RESERVATION_STATE",
              message,
            );
          }

          throw new PreorderRepositoryError("INVALID_PAYMENT", message);
        }
      }

      const payment = await tx.preorderPayment.create({
        data: {
          reservationId: input.reservationId,
          kind: paymentKindToPrisma[input.kind],
          amount: moneyToDecimal(input.amount),
          status: paymentStatusToPrisma[input.status],
          provider: input.provider
            ? paymentProviderToPrisma[input.provider]
            : null,
          providerPaymentId: input.providerPaymentId ?? null,
          metadata: input.metadata,
          paidAt:
            input.status === PreorderPaymentStatus.PAID
              ? input.paidAt ?? input.createdAt
              : null,
          createdAt: input.createdAt,
        },
      });

      if (nextReservation) {
        await tx.preorderReservation.update({
          where: { id: input.reservationId },
          data: {
            status: reservationStatusToPrisma[nextReservation.status],
            confirmedAt: nextReservation.confirmedAt,
          },
        });
      }

      return toDomainPayment(payment);
    });
  }

  async listPaymentsByReservation(
    reservationId: string,
  ): Promise<PreorderPayment[]> {
    const payments = await prisma.preorderPayment.findMany({
      where: { reservationId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    return payments.map(toDomainPayment);
  }

  async expirePendingReservations(
    input: ExpirePendingPreorderReservationsInput,
  ): Promise<ExpirePendingPreorderReservationsResult> {
    const batchSize = expirationBatchSize(input.batchSize);

    if (input.campaignId) {
      const result = await prisma.preorderReservation.updateMany({
        where: {
          campaignId: input.campaignId,
          status: PRISMA_RESERVATION_STATUS.PENDING,
          expiresAt: { lt: input.now },
        },
        data: { status: PRISMA_RESERVATION_STATUS.EXPIRED },
      });

      return { expiredCount: result.count };
    }

    return prisma.$transaction(async (tx) => {
      const staleReservations = await tx.preorderReservation.findMany({
        where: {
          status: PRISMA_RESERVATION_STATUS.PENDING,
          expiresAt: { lt: input.now },
        },
        select: { id: true },
        orderBy: [{ expiresAt: "asc" }, { id: "asc" }],
        take: batchSize,
      });

      if (staleReservations.length === 0) {
        return { expiredCount: 0 };
      }

      const result = await tx.preorderReservation.updateMany({
        where: {
          id: { in: staleReservations.map((reservation) => reservation.id) },
          status: PRISMA_RESERVATION_STATUS.PENDING,
          expiresAt: { lt: input.now },
        },
        data: { status: PRISMA_RESERVATION_STATUS.EXPIRED },
      });

      return { expiredCount: result.count };
    });
  }
}
