import type { APIRoute } from "astro";

import {
  hydrateCartLines,
  parseCartQtyLines,
} from "@/application/cart/serverCart";
import {
  generateGuestAccessToken,
  generateOrderReferenceCode,
} from "@/application/orders/orderReference";
import {
  orderInclude,
  serializeOrder,
} from "@/application/orders/serializeOrder";
import { failure, success } from "@/endpoints/api/shared/api-response";
import { ApplicationError } from "@/endpoints/api/shared/api-errors";
import {
  parseJsonBody,
  type JsonObject,
} from "@/endpoints/api/shared/query";
import { prisma } from "@/infrastructure/database/prisma";

const asOptionalTrimmed = (value: unknown, max = 240): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
};

const parseItems = (body: JsonObject) => {
  const raw = body.items;
  if (!Array.isArray(raw) || raw.length === 0) {
    throw ApplicationError.validation("items must be a non-empty array");
  }
  return parseCartQtyLines(raw);
};

const parsePaymentMethod = (value: unknown): "QR_BANK" | "WHATSAPP" => {
  if (value === "WHATSAPP") return "WHATSAPP";
  return "QR_BANK";
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await parseJsonBody(request);
    const requestItems = parseItems(body);
    const paymentMethod = parsePaymentMethod(body.paymentMethod);
    const customerName = asOptionalTrimmed(body.customerName, 80);
    const customerPhone = asOptionalTrimmed(body.customerPhone, 40);
    const customerCity = asOptionalTrimmed(body.customerCity, 80);
    const customerNote = asOptionalTrimmed(body.customerNote, 240);

    if (paymentMethod === "QR_BANK" && !customerName) {
      throw ApplicationError.validation("El nombre es requerido para pagar con QR");
    }
    if (paymentMethod === "QR_BANK" && !customerPhone) {
      throw ApplicationError.validation(
        "El teléfono es requerido para pagar con QR",
      );
    }

    const hydrated = await hydrateCartLines(requestItems);
    const lines = hydrated.filter((item) => item.canPurchase && item.stock > 0);

    if (lines.length === 0) {
      throw ApplicationError.validation(
        "No hay productos disponibles para crear el pedido",
      );
    }

    const blocked = hydrated.some(
      (item) => !item.found || !item.canPurchase || item.quantity > item.stock,
    );
    if (blocked) {
      throw ApplicationError.validation(
        "El carrito tiene productos no disponibles o sin stock",
      );
    }

    const totalAmount = lines.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const userId = locals.user?.id ?? null;
    const guestAccessToken = userId ? null : generateGuestAccessToken();
    const initialStatus =
      paymentMethod === "QR_BANK" ? "AWAITING_PAYMENT" : "PENDING";

    const order = await prisma.$transaction(async (tx) => {
      let referenceCode = generateOrderReferenceCode();
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const existing = await tx.order.findUnique({
          where: { referenceCode },
          select: { id: true },
        });
        if (!existing) break;
        referenceCode = generateOrderReferenceCode();
      }

      const created = await tx.order.create({
        data: {
          userId,
          status: initialStatus,
          totalAmount,
          customerName,
          customerPhone,
          customerCity,
          customerNote,
          paymentMethod,
          referenceCode,
          guestAccessToken,
          items: {
            create: lines.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
          payments: {
            create: {
              amount: totalAmount,
              status: "PENDING",
              provider: paymentMethod,
            },
          },
        },
        include: orderInclude,
      });

      if (userId) {
        await tx.user.update({
          where: { id: userId },
          data: { cartJson: [] },
        });
      }

      return created;
    });

    return success(
      {
        order: serializeOrder(order, { includeGuestToken: !userId }),
      },
      { status: 201 },
    );
  } catch (error) {
    return failure(error);
  }
};
