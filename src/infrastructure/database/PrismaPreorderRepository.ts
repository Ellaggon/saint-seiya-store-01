import {
  Prisma,
  PreorderCampaignStatus as PrismaCampaignStatus,
  PreorderReservationStatus as PrismaReservationStatus,
} from "@prisma/client";

import { PreorderCampaignStatus } from "@/domain/entities/PreorderCampaign";
import {
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
  reservationStatusToPrisma,
  toDomainCampaign,
  toDomainPayment,
  toDomainReservation,
  toPersistenceCampaignInput,
  toPersistenceCampaignUpdateInput,
} from "./mappers/preorder.mapper";

type TransactionClient = Prisma.TransactionClient;

const activeReservationWhere = {
  status: {
    in: ACTIVE_RESERVATION_STATUSES,
  },
} satisfies Prisma.PreorderReservationWhereInput;

const campaignDetailInclude = {
  product: {
    include: {
      category: true,
      collection: true,
      characters: {
        include: {
          character: true,
        },
      },
    },
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

const reservationDetailInclude = {
  payments: true,
} satisfies Prisma.PreorderReservationInclude;

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;

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
): PrismaCampaignStatus | undefined => {
  if (filters?.status) return mapCampaignStatusToPrisma(filters.status);
  if (filters?.availability === "SOLD_OUT") return PrismaCampaignStatus.SOLD_OUT;
  if (filters?.availability === "AVAILABLE" || filters?.availability === "OPEN") {
    return PrismaCampaignStatus.ACTIVE;
  }
  return undefined;
};

const mapCampaignStatusToPrisma = (
  status: PreorderCampaignStatus,
): PrismaCampaignStatus => {
  const map: Record<PreorderCampaignStatus, PrismaCampaignStatus> = {
    [PreorderCampaignStatus.DRAFT]: PrismaCampaignStatus.DRAFT,
    [PreorderCampaignStatus.ACTIVE]: PrismaCampaignStatus.ACTIVE,
    [PreorderCampaignStatus.PAUSED]: PrismaCampaignStatus.PAUSED,
    [PreorderCampaignStatus.SOLD_OUT]: PrismaCampaignStatus.SOLD_OUT,
    [PreorderCampaignStatus.ARRIVED]: PrismaCampaignStatus.ARRIVED,
    [PreorderCampaignStatus.CLOSED]: PrismaCampaignStatus.CLOSED,
    [PreorderCampaignStatus.CANCELED]: PrismaCampaignStatus.CANCELED,
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
  product: CampaignDetailRecord["product"],
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
  record: CampaignDetailRecord,
): PreorderCampaignWithProduct => ({
  campaign: toDomainCampaign(record),
  product: toProductSummary(record.product),
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
      status: PrismaReservationStatus.PENDING,
      expiresAt: {
        lt: now,
      },
    },
    data: {
      status: PrismaReservationStatus.EXPIRED,
    },
  });
};

export class PrismaPreorderRepository implements PreorderRepository {
  private readonly pricingService = new PreorderPricingService();

  async createCampaign(
    input: CreatePreorderCampaignInput,
  ): Promise<PreorderCampaign> {
    const campaign = await prisma.preorderCampaign.create({
      data: toPersistenceCampaignInput(input.campaign),
      include: campaignDetailInclude,
    });

    return toDomainCampaign(campaign);
  }

  async updateCampaign(
    input: UpdatePreorderCampaignInput,
  ): Promise<PreorderCampaign> {
    const campaign = await prisma.preorderCampaign.update({
      where: { id: input.campaign.id },
      data: toPersistenceCampaignUpdateInput(input.campaign),
      include: campaignDetailInclude,
    });

    return toDomainCampaign(campaign);
  }

  async findCampaignById(id: string): Promise<PreorderCampaign | null> {
    const campaign = await prisma.preorderCampaign.findUnique({
      where: { id },
      include: campaignDetailInclude,
    });

    return campaign ? toDomainCampaign(campaign) : null;
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

    const total = await prisma.preorderCampaign.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);

    const campaigns = await prisma.preorderCampaign.findMany({
      where,
      include: campaignDetailInclude,
      orderBy: campaignOrderBy(filters?.sort),
      skip: (safePage - 1) * pageSize,
      take: pageSize,
    });

    return {
      items: campaigns.map(toDomainCampaign),
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

    const campaign = await prisma.preorderCampaign.findFirst({
      where: {
        deletedAt: null,
        ...(lookup.id ? { id: lookup.id } : {}),
        ...(lookup.productId ? { productId: lookup.productId } : {}),
        ...(lookup.productSlug ? { product: { slug: lookup.productSlug } } : {}),
      },
      include: campaignDetailInclude,
      orderBy: campaignOrderBy("created-desc"),
    });

    return campaign ? toCampaignWithProduct(campaign) : null;
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
  ): Promise<PreorderPaginatedResult<CampaignDetailRecord>> {
    const page = toPositiveInt(filters?.page, 1);
    const requestedPageSize = toPositiveInt(filters?.pageSize, DEFAULT_PAGE_SIZE);
    const pageSize = Math.min(MAX_PAGE_SIZE, requestedPageSize);
    const where = campaignWhere(filters);

    const total = await prisma.preorderCampaign.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);

    const campaigns = await prisma.preorderCampaign.findMany({
      where,
      include: campaignDetailInclude,
      orderBy: campaignOrderBy(filters?.sort),
      skip: (safePage - 1) * pageSize,
      take: pageSize,
    });

    return {
      items: campaigns,
      page: safePage,
      pageSize,
      total,
      totalPages,
    };
  }

  async reserve(input: ReservePreorderInput): Promise<PreorderReservation> {
    return prisma.$transaction(async (tx) => {
      await lockCampaign(tx, input.campaignId);

      const campaign = await tx.preorderCampaign.findUnique({
        where: { id: input.campaignId },
        include: campaignDetailInclude,
      });

      if (!campaign || campaign.deletedAt) {
        throw new Error("Preorder campaign not found");
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
        throw new Error("User already has an active preorder reservation");
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
        throw new Error("Preorder campaign cannot accept this reservation");
      }

      if (reservedUnits + input.quantity > campaign.totalSlots) {
        throw new Error("Preorder campaign does not have enough available slots");
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
          status: PrismaReservationStatus.PENDING,
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
        throw new Error("Preorder campaign not found");
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
        throw new Error("User already has an active preorder reservation");
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
        throw new Error("Preorder campaign cannot accept this reservation");
      }

      if (reservedUnits + input.quantity > campaign.totalSlots) {
        throw new Error("Preorder campaign does not have enough available slots");
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
          status: PrismaReservationStatus.PENDING,
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
      data: { status: PrismaCampaignStatus.ARRIVED },
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
        throw new Error("Preorder reservation not found");
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
            throw new Error("Provider payment is already linked to another preorder reservation");
          }

          return toDomainPayment(existingPayment);
        }
      }

      const domainReservation = toDomainReservation(reservation);
      const nextReservation =
        input.status === PreorderPaymentStatus.PAID
          ? domainReservation.confirmPayment(
              input.amount,
              input.paidAt ?? input.createdAt,
            )
          : null;

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
}
