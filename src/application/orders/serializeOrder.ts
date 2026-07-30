import type {
  Order,
  OrderItem,
  OrderPayment,
  Product,
  User,
} from "@prisma/client";

type OrderWithRelations = Order & {
  items: Array<
    OrderItem & {
      product: Pick<Product, "id" | "name" | "imageUrl">;
    }
  >;
  payments?: OrderPayment[];
  user?: Pick<User, "id" | "email" | "name"> | null;
};

export const serializeOrder = (
  order: OrderWithRelations,
  options: { includeGuestToken?: boolean } = {},
) => {
  const activePayment =
    order.payments
      ?.slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;

  return {
    id: order.id,
    status: order.status,
    totalAmount: Number(order.totalAmount),
    shippingTrackerId: order.shippingTrackerId,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerCity: order.customerCity,
    customerNote: order.customerNote,
    paymentMethod: order.paymentMethod,
    referenceCode: order.referenceCode,
    guestAccessToken: options.includeGuestToken
      ? order.guestAccessToken
      : undefined,
    userId: order.userId,
    user: order.user
      ? {
          id: order.user.id,
          email: order.user.email,
          name: order.user.name,
        }
      : null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map((item) => ({
      productId: item.productId,
      name: item.product.name,
      imageUrl: item.product.imageUrl,
      quantity: item.quantity,
      price: Number(item.price),
    })),
    payment: activePayment
      ? {
          id: activePayment.id,
          amount: Number(activePayment.amount),
          status: activePayment.status,
          provider: activePayment.provider,
          proofUrl: activePayment.proofUrl,
          proofUploadedAt: activePayment.proofUploadedAt?.toISOString() ?? null,
          adminNote: activePayment.adminNote,
          reviewedAt: activePayment.reviewedAt?.toISOString() ?? null,
          paidAt: activePayment.paidAt?.toISOString() ?? null,
          createdAt: activePayment.createdAt.toISOString(),
        }
      : null,
  };
};

export const orderInclude = {
  items: {
    include: {
      product: {
        select: { id: true, name: true, imageUrl: true },
      },
    },
  },
  payments: {
    orderBy: { createdAt: "desc" as const },
  },
  user: {
    select: { id: true, email: true, name: true },
  },
} as const;
