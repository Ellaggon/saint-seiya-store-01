export type OrderStatusLabelKey =
  | "PENDING"
  | "AWAITING_PAYMENT"
  | "PAYMENT_REVIEW"
  | "PAID"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELED";

export const ORDER_STATUS_LABEL: Record<OrderStatusLabelKey, string> = {
  PENDING: "Pendiente",
  AWAITING_PAYMENT: "Pendiente de pago",
  PAYMENT_REVIEW: "Comprobante en revisión",
  PAID: "Pagado",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
  CANCELED: "Cancelado",
};

export const ORDER_STATUS_CLASS: Record<OrderStatusLabelKey, string> = {
  PENDING: "text-amber-500",
  AWAITING_PAYMENT: "text-amber-500",
  PAYMENT_REVIEW: "text-sky-400",
  PAID: "text-emerald-400",
  SHIPPED: "text-sky-400",
  DELIVERED: "text-white",
  CANCELED: "text-red-400",
};

export const orderStatusLabel = (status: string): string =>
  ORDER_STATUS_LABEL[status as OrderStatusLabelKey] ?? status;

export const orderStatusClass = (status: string): string =>
  ORDER_STATUS_CLASS[status as OrderStatusLabelKey] ?? "text-white";

export const canCustomerPayOrder = (status: string): boolean =>
  status === "AWAITING_PAYMENT" ||
  status === "PAYMENT_REVIEW" ||
  status === "PENDING";
