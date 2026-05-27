import {
  Prisma,
  type Prisma as PrismaType,
  type PreorderCampaignStatus as PrismaCampaignStatusType,
  type PreorderDepositType as PrismaDepositTypeType,
  type PreorderPaymentKind as PrismaPaymentKindType,
  type PreorderPaymentProvider as PrismaPaymentProviderType,
  type PreorderPaymentStatus as PrismaPaymentStatusType,
  type PreorderReservationStatus as PrismaReservationStatusType,
  type PreorderCampaign as PrismaCampaignModel,
  type PreorderPayment as PrismaPaymentModel,
  type PreorderReservation as PrismaReservationModel,
} from "@prisma/client";

import {
  PreorderCampaign,
  PreorderCampaignStatus,
  PreorderDepositType,
} from "@/domain/entities/PreorderCampaign";
import {
  PreorderPayment,
  PreorderPaymentKind,
  PreorderPaymentProvider,
  PreorderPaymentStatus,
} from "@/domain/entities/PreorderPayment";
import {
  PreorderReservation,
  PreorderReservationStatus,
} from "@/domain/entities/PreorderReservation";
import { Money } from "@/domain/value-objects/Money";

export const PRISMA_CAMPAIGN_STATUS = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  SOLD_OUT: "SOLD_OUT",
  ARRIVED: "ARRIVED",
  CLOSED: "CLOSED",
  CANCELED: "CANCELED",
} as const satisfies Record<PrismaCampaignStatusType, PrismaCampaignStatusType>;

const PRISMA_DEPOSIT_TYPE = {
  PERCENT: "PERCENT",
  FIXED: "FIXED",
  FULL: "FULL",
} as const satisfies Record<PrismaDepositTypeType, PrismaDepositTypeType>;

export const PRISMA_RESERVATION_STATUS = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  PARTIALLY_PAID: "PARTIALLY_PAID",
  PAID: "PAID",
  CANCELED: "CANCELED",
  EXPIRED: "EXPIRED",
  FULFILLED: "FULFILLED",
} as const satisfies Record<
  PrismaReservationStatusType,
  PrismaReservationStatusType
>;

const PRISMA_PAYMENT_KIND = {
  DEPOSIT: "DEPOSIT",
  FULL: "FULL",
  BALANCE: "BALANCE",
} as const satisfies Record<PrismaPaymentKindType, PrismaPaymentKindType>;

const PRISMA_PAYMENT_STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
  CANCELED: "CANCELED",
  REFUNDED: "REFUNDED",
} as const satisfies Record<PrismaPaymentStatusType, PrismaPaymentStatusType>;

const PRISMA_PAYMENT_PROVIDER = {
  MANUAL: "MANUAL",
  STRIPE: "STRIPE",
  MERCADOPAGO: "MERCADOPAGO",
  WEBPAY: "WEBPAY",
  PAYPAL: "PAYPAL",
} as const satisfies Record<
  PrismaPaymentProviderType,
  PrismaPaymentProviderType
>;

export type PrismaPaymentRecord = PrismaPaymentModel;

export type PrismaReservationRecord = PrismaReservationModel & {
  payments?: PrismaPaymentRecord[];
};

export type PrismaCampaignRecord = PrismaCampaignModel & {
  reservations?: PrismaReservationRecord[];
};

export const ACTIVE_RESERVATION_STATUSES: PrismaReservationStatusType[] = [
  PRISMA_RESERVATION_STATUS.PENDING,
  PRISMA_RESERVATION_STATUS.CONFIRMED,
  PRISMA_RESERVATION_STATUS.PARTIALLY_PAID,
  PRISMA_RESERVATION_STATUS.PAID,
];

const campaignStatusToDomain: Record<
  PrismaCampaignStatusType,
  PreorderCampaignStatus
> = {
  [PRISMA_CAMPAIGN_STATUS.DRAFT]: PreorderCampaignStatus.DRAFT,
  [PRISMA_CAMPAIGN_STATUS.ACTIVE]: PreorderCampaignStatus.ACTIVE,
  [PRISMA_CAMPAIGN_STATUS.PAUSED]: PreorderCampaignStatus.PAUSED,
  [PRISMA_CAMPAIGN_STATUS.SOLD_OUT]: PreorderCampaignStatus.SOLD_OUT,
  [PRISMA_CAMPAIGN_STATUS.ARRIVED]: PreorderCampaignStatus.ARRIVED,
  [PRISMA_CAMPAIGN_STATUS.CLOSED]: PreorderCampaignStatus.CLOSED,
  [PRISMA_CAMPAIGN_STATUS.CANCELED]: PreorderCampaignStatus.CANCELED,
};

const campaignStatusToPrisma: Record<
  PreorderCampaignStatus,
  PrismaCampaignStatusType
> = {
  [PreorderCampaignStatus.DRAFT]: PRISMA_CAMPAIGN_STATUS.DRAFT,
  [PreorderCampaignStatus.ACTIVE]: PRISMA_CAMPAIGN_STATUS.ACTIVE,
  [PreorderCampaignStatus.PAUSED]: PRISMA_CAMPAIGN_STATUS.PAUSED,
  [PreorderCampaignStatus.SOLD_OUT]: PRISMA_CAMPAIGN_STATUS.SOLD_OUT,
  [PreorderCampaignStatus.ARRIVED]: PRISMA_CAMPAIGN_STATUS.ARRIVED,
  [PreorderCampaignStatus.CLOSED]: PRISMA_CAMPAIGN_STATUS.CLOSED,
  [PreorderCampaignStatus.CANCELED]: PRISMA_CAMPAIGN_STATUS.CANCELED,
};

const depositTypeToDomain: Record<PrismaDepositTypeType, PreorderDepositType> = {
  [PRISMA_DEPOSIT_TYPE.PERCENT]: PreorderDepositType.PERCENT,
  [PRISMA_DEPOSIT_TYPE.FIXED]: PreorderDepositType.FIXED,
  [PRISMA_DEPOSIT_TYPE.FULL]: PreorderDepositType.FULL,
};

const depositTypeToPrisma: Record<PreorderDepositType, PrismaDepositTypeType> = {
  [PreorderDepositType.PERCENT]: PRISMA_DEPOSIT_TYPE.PERCENT,
  [PreorderDepositType.FIXED]: PRISMA_DEPOSIT_TYPE.FIXED,
  [PreorderDepositType.FULL]: PRISMA_DEPOSIT_TYPE.FULL,
};

const reservationStatusToDomain: Record<
  PrismaReservationStatusType,
  PreorderReservationStatus
> = {
  [PRISMA_RESERVATION_STATUS.PENDING]: PreorderReservationStatus.PENDING,
  [PRISMA_RESERVATION_STATUS.CONFIRMED]: PreorderReservationStatus.CONFIRMED,
  [PRISMA_RESERVATION_STATUS.PARTIALLY_PAID]:
    PreorderReservationStatus.PARTIALLY_PAID,
  [PRISMA_RESERVATION_STATUS.PAID]: PreorderReservationStatus.PAID,
  [PRISMA_RESERVATION_STATUS.CANCELED]: PreorderReservationStatus.CANCELED,
  [PRISMA_RESERVATION_STATUS.EXPIRED]: PreorderReservationStatus.EXPIRED,
  [PRISMA_RESERVATION_STATUS.FULFILLED]: PreorderReservationStatus.FULFILLED,
};

export const reservationStatusToPrisma: Record<
  PreorderReservationStatus,
  PrismaReservationStatusType
> = {
  [PreorderReservationStatus.PENDING]: PRISMA_RESERVATION_STATUS.PENDING,
  [PreorderReservationStatus.CONFIRMED]: PRISMA_RESERVATION_STATUS.CONFIRMED,
  [PreorderReservationStatus.PARTIALLY_PAID]:
    PRISMA_RESERVATION_STATUS.PARTIALLY_PAID,
  [PreorderReservationStatus.PAID]: PRISMA_RESERVATION_STATUS.PAID,
  [PreorderReservationStatus.CANCELED]: PRISMA_RESERVATION_STATUS.CANCELED,
  [PreorderReservationStatus.EXPIRED]: PRISMA_RESERVATION_STATUS.EXPIRED,
  [PreorderReservationStatus.FULFILLED]: PRISMA_RESERVATION_STATUS.FULFILLED,
};

const paymentKindToDomain: Record<PrismaPaymentKindType, PreorderPaymentKind> = {
  [PRISMA_PAYMENT_KIND.DEPOSIT]: PreorderPaymentKind.DEPOSIT,
  [PRISMA_PAYMENT_KIND.FULL]: PreorderPaymentKind.FULL,
  [PRISMA_PAYMENT_KIND.BALANCE]: PreorderPaymentKind.BALANCE,
};

export const paymentKindToPrisma: Record<
  PreorderPaymentKind,
  PrismaPaymentKindType
> = {
  [PreorderPaymentKind.DEPOSIT]: PRISMA_PAYMENT_KIND.DEPOSIT,
  [PreorderPaymentKind.FULL]: PRISMA_PAYMENT_KIND.FULL,
  [PreorderPaymentKind.BALANCE]: PRISMA_PAYMENT_KIND.BALANCE,
};

const paymentStatusToDomain: Record<
  PrismaPaymentStatusType,
  PreorderPaymentStatus
> = {
  [PRISMA_PAYMENT_STATUS.PENDING]: PreorderPaymentStatus.PENDING,
  [PRISMA_PAYMENT_STATUS.PAID]: PreorderPaymentStatus.PAID,
  [PRISMA_PAYMENT_STATUS.FAILED]: PreorderPaymentStatus.FAILED,
  [PRISMA_PAYMENT_STATUS.CANCELED]: PreorderPaymentStatus.CANCELED,
  [PRISMA_PAYMENT_STATUS.REFUNDED]: PreorderPaymentStatus.REFUNDED,
};

export const paymentStatusToPrisma: Record<
  PreorderPaymentStatus,
  PrismaPaymentStatusType
> = {
  [PreorderPaymentStatus.PENDING]: PRISMA_PAYMENT_STATUS.PENDING,
  [PreorderPaymentStatus.PAID]: PRISMA_PAYMENT_STATUS.PAID,
  [PreorderPaymentStatus.FAILED]: PRISMA_PAYMENT_STATUS.FAILED,
  [PreorderPaymentStatus.CANCELED]: PRISMA_PAYMENT_STATUS.CANCELED,
  [PreorderPaymentStatus.REFUNDED]: PRISMA_PAYMENT_STATUS.REFUNDED,
};

const paymentProviderToDomain: Record<
  PrismaPaymentProviderType,
  PreorderPaymentProvider
> = {
  [PRISMA_PAYMENT_PROVIDER.MANUAL]: PreorderPaymentProvider.MANUAL,
  [PRISMA_PAYMENT_PROVIDER.STRIPE]: PreorderPaymentProvider.STRIPE,
  [PRISMA_PAYMENT_PROVIDER.MERCADOPAGO]: PreorderPaymentProvider.MERCADOPAGO,
  [PRISMA_PAYMENT_PROVIDER.WEBPAY]: PreorderPaymentProvider.WEBPAY,
  [PRISMA_PAYMENT_PROVIDER.PAYPAL]: PreorderPaymentProvider.PAYPAL,
};

export const paymentProviderToPrisma: Record<
  PreorderPaymentProvider,
  PrismaPaymentProviderType
> = {
  [PreorderPaymentProvider.MANUAL]: PRISMA_PAYMENT_PROVIDER.MANUAL,
  [PreorderPaymentProvider.STRIPE]: PRISMA_PAYMENT_PROVIDER.STRIPE,
  [PreorderPaymentProvider.MERCADOPAGO]: PRISMA_PAYMENT_PROVIDER.MERCADOPAGO,
  [PreorderPaymentProvider.WEBPAY]: PRISMA_PAYMENT_PROVIDER.WEBPAY,
  [PreorderPaymentProvider.PAYPAL]: PRISMA_PAYMENT_PROVIDER.PAYPAL,
};

export const decimalToMoney = (value: PrismaType.Decimal): Money =>
  Money.from(value.toNumber());

export const moneyToDecimal = (value: Money): PrismaType.Decimal =>
  new Prisma.Decimal(value.toNumber());

export const isActiveReservationStatus = (
  status: PrismaReservationStatusType,
): boolean => ACTIVE_RESERVATION_STATUSES.includes(status);

export const calculateReservedUnits = (
  reservations: PrismaReservationRecord[] = [],
): number =>
  reservations
    .filter((reservation) => isActiveReservationStatus(reservation.status))
    .reduce((total, reservation) => total + reservation.quantity, 0);

export const toDomainPayment = (
  payment: PrismaPaymentRecord,
): PreorderPayment =>
  PreorderPayment.create({
    id: payment.id,
    reservationId: payment.reservationId,
    kind: paymentKindToDomain[payment.kind],
    amount: decimalToMoney(payment.amount),
    status: paymentStatusToDomain[payment.status],
    provider: payment.provider ? paymentProviderToDomain[payment.provider] : null,
    providerPaymentId: payment.providerPaymentId,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
    paidAt: payment.paidAt,
  });

export const toDomainReservation = (
  reservation: PrismaReservationRecord,
): PreorderReservation => {
  const payments = reservation.payments?.map(toDomainPayment) ?? [];
  const paidAmount = PreorderReservation.paidAmountFromPayments(payments);

  return PreorderReservation.create({
    id: reservation.id,
    campaignId: reservation.campaignId,
    userId: reservation.userId,
    quantity: reservation.quantity,
    unitPrice: decimalToMoney(reservation.unitPrice),
    totalAmount: decimalToMoney(reservation.totalAmount),
    depositRequired: decimalToMoney(reservation.depositRequired),
    paidAmount,
    status: reservationStatusToDomain[reservation.status],
    expiresAt: reservation.expiresAt,
    confirmedAt: reservation.confirmedAt,
    canceledAt: reservation.canceledAt,
    createdAt: reservation.createdAt,
    updatedAt: reservation.updatedAt,
  });
};

export const toDomainCampaign = (
  campaign: PrismaCampaignRecord,
): PreorderCampaign =>
  PreorderCampaign.create({
    id: campaign.id,
    productId: campaign.productId,
    status: campaignStatusToDomain[campaign.status],
    totalSlots: campaign.totalSlots,
    reservedUnits: calculateReservedUnits(campaign.reservations),
    depositType: depositTypeToDomain[campaign.depositType],
    depositValue: decimalToMoney(campaign.depositValue).toNumber(),
    allowFullPayment: campaign.allowFullPayment,
    opensAt: campaign.opensAt,
    closesAt: campaign.closesAt,
    releaseDate: campaign.releaseDate,
    etaStart: campaign.etaStart,
    etaEnd: campaign.etaEnd,
    etaLabel: campaign.etaLabel,
    terms: campaign.terms,
    arrivalNotes: campaign.arrivalNotes,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
    deletedAt: campaign.deletedAt,
  });

export const toPersistenceCampaignInput = (
  campaign: PreorderCampaign,
): PrismaType.PreorderCampaignUncheckedCreateInput => ({
  id: campaign.id,
  productId: campaign.productId,
  status: campaignStatusToPrisma[campaign.status],
  totalSlots: campaign.totalSlots,
  depositType: depositTypeToPrisma[campaign.depositType],
  depositValue: new Prisma.Decimal(campaign.depositValue),
  allowFullPayment: campaign.allowFullPayment,
  opensAt: campaign.opensAt,
  closesAt: campaign.closesAt,
  releaseDate: campaign.releaseDate,
  etaStart: campaign.etaStart,
  etaEnd: campaign.etaEnd,
  etaLabel: campaign.etaLabel,
  terms: campaign.terms,
  arrivalNotes: campaign.arrivalNotes,
  createdAt: campaign.createdAt,
  deletedAt: campaign.deletedAt,
});

export const toPersistenceCampaignUpdateInput = (
  campaign: PreorderCampaign,
): PrismaType.PreorderCampaignUncheckedUpdateInput => ({
  productId: campaign.productId,
  status: campaignStatusToPrisma[campaign.status],
  totalSlots: campaign.totalSlots,
  depositType: depositTypeToPrisma[campaign.depositType],
  depositValue: new Prisma.Decimal(campaign.depositValue),
  allowFullPayment: campaign.allowFullPayment,
  opensAt: campaign.opensAt,
  closesAt: campaign.closesAt,
  releaseDate: campaign.releaseDate,
  etaStart: campaign.etaStart,
  etaEnd: campaign.etaEnd,
  etaLabel: campaign.etaLabel,
  terms: campaign.terms,
  arrivalNotes: campaign.arrivalNotes,
  deletedAt: campaign.deletedAt,
});
