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
  PreorderPaginatedResult,
  PreorderRepository,
  RegisterPreorderPaymentInput,
  ReservePreorderInput,
  UpdatePreorderCampaignInput,
} from "@/domain/repositories/PreorderRepository";
import { PreorderPricingService } from "@/domain/services/PreorderPricingService";

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
    include: {
      payments: true,
    },
  },
} satisfies Prisma.PreorderCampaignInclude;

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

const campaignWhere = (
  filters?: PreorderCampaignFilters,
): Prisma.PreorderCampaignWhereInput => ({
  ...(filters?.includeDeleted ? {} : { deletedAt: null }),
  ...(filters?.productId ? { productId: filters.productId } : {}),
  ...(filters?.status
    ? { status: mapCampaignStatusToPrisma(filters.status) }
    : {}),
});

const activeReservationWhere = {
  status: {
    in: ACTIVE_RESERVATION_STATUSES,
  },
} satisfies Prisma.PreorderReservationWhereInput;

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
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
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
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
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
        const existingPayment = await tx.preorderPayment.findFirst({
          where: {
            reservationId: input.reservationId,
            provider: paymentProviderToPrisma[input.provider],
            providerPaymentId: input.providerPaymentId,
          },
        });

        if (existingPayment) {
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
