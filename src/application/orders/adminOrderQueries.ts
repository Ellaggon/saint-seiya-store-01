import type { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/infrastructure/database/prisma";
import { orderInclude } from "./serializeOrder";

type AdminOrderQuery = {
  status?: OrderStatus;
  q?: string;
};

const legacyOrderSelect = {
  id: true,
  userId: true,
  status: true,
  totalAmount: true,
  shippingTrackerId: true,
  createdAt: true,
  updatedAt: true,
  items: {
    include: {
      product: {
        select: { id: true, name: true, imageUrl: true },
      },
    },
  },
  user: {
    select: { id: true, email: true, name: true },
  },
} as const;

const isOrderPaymentSchemaUnavailable = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Order.customerName") ||
    message.includes("Order.customerPhone") ||
    message.includes("Order.referenceCode") ||
    message.includes("OrderPayment")
  );
};

const legacyOrder = (order: any) => ({
  ...order,
  customerName: null,
  customerPhone: null,
  customerCity: null,
  customerNote: null,
  paymentMethod: "WHATSAPP",
  referenceCode: `SAN-${order.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
  guestAccessToken: null,
  payments: [],
});

const currentWhere = ({ status, q }: AdminOrderQuery): Prisma.OrderWhereInput => {
  const where: Prisma.OrderWhereInput = {};
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { referenceCode: { contains: q, mode: "insensitive" } },
      { customerName: { contains: q, mode: "insensitive" } },
      { customerPhone: { contains: q, mode: "insensitive" } },
      { id: { contains: q, mode: "insensitive" } },
    ];
  }
  return where;
};

const legacyWhere = ({ status, q }: AdminOrderQuery): Prisma.OrderWhereInput => {
  const where: Prisma.OrderWhereInput = {};
  // QR-only statuses do not exist in databases that predate the payment migration.
  if (status && !["AWAITING_PAYMENT", "PAYMENT_REVIEW"].includes(status)) {
    where.status = status;
  }
  if (q) where.id = { contains: q, mode: "insensitive" };
  return where;
};

export const listAdminOrders = async (query: AdminOrderQuery = {}): Promise<any[]> => {
  try {
    return await prisma.order.findMany({
      where: currentWhere(query),
      orderBy: { createdAt: "desc" },
      take: 100,
      include: orderInclude,
    });
  } catch (error) {
    if (!isOrderPaymentSchemaUnavailable(error)) throw error;
    console.warn("[Orders] QR payment migration is pending; serving legacy orders.");
    const orders = await prisma.order.findMany({
      where: legacyWhere(query),
      orderBy: { createdAt: "desc" },
      take: 100,
      select: legacyOrderSelect,
    });
    return orders.map(legacyOrder);
  }
};

export const findAdminOrderById = async (id: string): Promise<any | null> => {
  try {
    return await prisma.order.findUnique({ where: { id }, include: orderInclude });
  } catch (error) {
    if (!isOrderPaymentSchemaUnavailable(error)) throw error;
    const order = await prisma.order.findUnique({
      where: { id },
      select: legacyOrderSelect,
    });
    return order ? legacyOrder(order) : null;
  }
};
