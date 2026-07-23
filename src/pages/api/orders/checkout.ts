import type { APIRoute } from "astro";

import {
  hydrateCartLines,
  parseCartQtyLines,
} from "@/application/cart/serverCart";
import { failure, success } from "@/endpoints/api/shared/api-response";
import { ApplicationError } from "@/endpoints/api/shared/api-errors";
import { requireUser } from "@/endpoints/api/shared/auth";
import {
  parseJsonBody,
  type JsonObject,
} from "@/endpoints/api/shared/query";
import { prisma } from "@/infrastructure/database/prisma";

const parseItems = (body: JsonObject) => {
  const raw = body.items;
  if (!Array.isArray(raw) || raw.length === 0) {
    throw ApplicationError.validation("items must be a non-empty array");
  }
  return parseCartQtyLines(raw);
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const user = requireUser(locals);
    const body = await parseJsonBody(request);
    const requestItems = parseItems(body);

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

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId: user.id,
          status: "PENDING",
          totalAmount,
          items: {
            create: lines.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, imageUrl: true },
              },
            },
          },
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { cartJson: [] },
      });

      return created;
    });

    return success(
      {
        order: {
          id: order.id,
          status: order.status,
          totalAmount: Number(order.totalAmount),
          createdAt: order.createdAt.toISOString(),
          items: order.items.map((item) => ({
            productId: item.productId,
            name: item.product.name,
            imageUrl: item.product.imageUrl,
            quantity: item.quantity,
            price: Number(item.price),
          })),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return failure(error);
  }
};
