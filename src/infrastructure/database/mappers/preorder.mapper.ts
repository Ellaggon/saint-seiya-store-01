import {
  Prisma,
  PreorderCampaignStatus as PrismaCampaignStatus,
  PreorderDepositType as PrismaDepositType,
  PreorderPaymentKind as PrismaPaymentKind,
  PreorderPaymentProvider as PrismaPaymentProvider,
  PreorderPaymentStatus as PrismaPaymentStatus,
  PreorderReservationStatus as PrismaReservationStatus,
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

export type PrismaPaymentRecord = PrismaPaymentModel;

export type PrismaReservationRecord = PrismaReservationModel & {
  payments?: PrismaPaymentRecord[];
};

export type PrismaCampaignRecord = PrismaCampaignModel & {
  reservations?: PrismaReservationRecord[];
};

export const ACTIVE_RESERVATION_STATUSES: PrismaReservationStatus[] = [
  PrismaReservationStatus.PENDING,
  PrismaReservationStatus.CONFIRMED,
  PrismaReservationStatus.PARTIALLY_PAID,
  PrismaReservationStatus.PAID,
];

const campaignStatusToDomain: Record<
  PrismaCampaignStatus,
  PreorderCampaignStatus
> = {
  [PrismaCampaignStatus.DRAFT]: PreorderCampaignStatus.DRAFT,
  [PrismaCampaignStatus.ACTIVE]: PreorderCampaignStatus.ACTIVE,
  [PrismaCampaignStatus.PAUSED]: PreorderCampaignStatus.PAUSED,
  [PrismaCampaignStatus.SOLD_OUT]: PreorderCampaignStatus.SOLD_OUT,
  [PrismaCampaignStatus.ARRIVED]: PreorderCampaignStatus.ARRIVED,
  [PrismaCampaignStatus.CLOSED]: PreorderCampaignStatus.CLOSED,
  [PrismaCampaignStatus.CANCELED]: PreorderCampaignStatus.CANCELED,
};

const campaignStatusToPrisma: Record<
  PreorderCampaignStatus,
  PrismaCampaignStatus
> = {
  [PreorderCampaignStatus.DRAFT]: PrismaCampaignStatus.DRAFT,
  [PreorderCampaignStatus.ACTIVE]: PrismaCampaignStatus.ACTIVE,
  [PreorderCampaignStatus.PAUSED]: PrismaCampaignStatus.PAUSED,
  [PreorderCampaignStatus.SOLD_OUT]: PrismaCampaignStatus.SOLD_OUT,
  [PreorderCampaignStatus.ARRIVED]: PrismaCampaignStatus.ARRIVED,
  [PreorderCampaignStatus.CLOSED]: PrismaCampaignStatus.CLOSED,
  [PreorderCampaignStatus.CANCELED]: PrismaCampaignStatus.CANCELED,
};

const depositTypeToDomain: Record<PrismaDepositType, PreorderDepositType> = {
  [PrismaDepositType.PERCENT]: PreorderDepositType.PERCENT,
  [PrismaDepositType.FIXED]: PreorderDepositType.FIXED,
  [PrismaDepositType.FULL]: PreorderDepositType.FULL,
};

const depositTypeToPrisma: Record<PreorderDepositType, PrismaDepositType> = {
  [PreorderDepositType.PERCENT]: PrismaDepositType.PERCENT,
  [PreorderDepositType.FIXED]: PrismaDepositType.FIXED,
  [PreorderDepositType.FULL]: PrismaDepositType.FULL,
};

const reservationStatusToDomain: Record<
  PrismaReservationStatus,
  PreorderReservationStatus
> = {
  [PrismaReservationStatus.PENDING]: PreorderReservationStatus.PENDING,
  [PrismaReservationStatus.CONFIRMED]: PreorderReservationStatus.CONFIRMED,
  [PrismaReservationStatus.PARTIALLY_PAID]:
    PreorderReservationStatus.PARTIALLY_PAID,
  [PrismaReservationStatus.PAID]: PreorderReservationStatus.PAID,
  [PrismaReservationStatus.CANCELED]: PreorderReservationStatus.CANCELED,
  [PrismaReservationStatus.EXPIRED]: PreorderReservationStatus.EXPIRED,
  [PrismaReservationStatus.FULFILLED]: PreorderReservationStatus.FULFILLED,
};

export const reservationStatusToPrisma: Record<
  PreorderReservationStatus,
  PrismaReservationStatus
> = {
  [PreorderReservationStatus.PENDING]: PrismaReservationStatus.PENDING,
  [PreorderReservationStatus.CONFIRMED]: PrismaReservationStatus.CONFIRMED,
  [PreorderReservationStatus.PARTIALLY_PAID]:
    PrismaReservationStatus.PARTIALLY_PAID,
  [PreorderReservationStatus.PAID]: PrismaReservationStatus.PAID,
  [PreorderReservationStatus.CANCELED]: PrismaReservationStatus.CANCELED,
  [PreorderReservationStatus.EXPIRED]: PrismaReservationStatus.EXPIRED,
  [PreorderReservationStatus.FULFILLED]: PrismaReservationStatus.FULFILLED,
};

const paymentKindToDomain: Record<PrismaPaymentKind, PreorderPaymentKind> = {
  [PrismaPaymentKind.DEPOSIT]: PreorderPaymentKind.DEPOSIT,
  [PrismaPaymentKind.FULL]: PreorderPaymentKind.FULL,
  [PrismaPaymentKind.BALANCE]: PreorderPaymentKind.BALANCE,
};

export const paymentKindToPrisma: Record<
  PreorderPaymentKind,
  PrismaPaymentKind
> = {
  [PreorderPaymentKind.DEPOSIT]: PrismaPaymentKind.DEPOSIT,
  [PreorderPaymentKind.FULL]: PrismaPaymentKind.FULL,
  [PreorderPaymentKind.BALANCE]: PrismaPaymentKind.BALANCE,
};

const paymentStatusToDomain: Record<
  PrismaPaymentStatus,
  PreorderPaymentStatus
> = {
  [PrismaPaymentStatus.PENDING]: PreorderPaymentStatus.PENDING,
  [PrismaPaymentStatus.PAID]: PreorderPaymentStatus.PAID,
  [PrismaPaymentStatus.FAILED]: PreorderPaymentStatus.FAILED,
  [PrismaPaymentStatus.CANCELED]: PreorderPaymentStatus.CANCELED,
  [PrismaPaymentStatus.REFUNDED]: PreorderPaymentStatus.REFUNDED,
};

export const paymentStatusToPrisma: Record<
  PreorderPaymentStatus,
  PrismaPaymentStatus
> = {
  [PreorderPaymentStatus.PENDING]: PrismaPaymentStatus.PENDING,
  [PreorderPaymentStatus.PAID]: PrismaPaymentStatus.PAID,
  [PreorderPaymentStatus.FAILED]: PrismaPaymentStatus.FAILED,
  [PreorderPaymentStatus.CANCELED]: PrismaPaymentStatus.CANCELED,
  [PreorderPaymentStatus.REFUNDED]: PrismaPaymentStatus.REFUNDED,
};

const paymentProviderToDomain: Record<
  PrismaPaymentProvider,
  PreorderPaymentProvider
> = {
  [PrismaPaymentProvider.MANUAL]: PreorderPaymentProvider.MANUAL,
  [PrismaPaymentProvider.STRIPE]: PreorderPaymentProvider.STRIPE,
  [PrismaPaymentProvider.MERCADOPAGO]: PreorderPaymentProvider.MERCADOPAGO,
  [PrismaPaymentProvider.WEBPAY]: PreorderPaymentProvider.WEBPAY,
  [PrismaPaymentProvider.PAYPAL]: PreorderPaymentProvider.PAYPAL,
};

export const paymentProviderToPrisma: Record<
  PreorderPaymentProvider,
  PrismaPaymentProvider
> = {
  [PreorderPaymentProvider.MANUAL]: PrismaPaymentProvider.MANUAL,
  [PreorderPaymentProvider.STRIPE]: PrismaPaymentProvider.STRIPE,
  [PreorderPaymentProvider.MERCADOPAGO]: PrismaPaymentProvider.MERCADOPAGO,
  [PreorderPaymentProvider.WEBPAY]: PrismaPaymentProvider.WEBPAY,
  [PreorderPaymentProvider.PAYPAL]: PrismaPaymentProvider.PAYPAL,
};

export const decimalToMoney = (value: Prisma.Decimal): Money =>
  Money.from(value.toNumber());

export const moneyToDecimal = (value: Money): Prisma.Decimal =>
  new Prisma.Decimal(value.toNumber());

export const isActiveReservationStatus = (
  status: PrismaReservationStatus,
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
): Prisma.PreorderCampaignUncheckedCreateInput => ({
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
): Prisma.PreorderCampaignUncheckedUpdateInput => ({
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
