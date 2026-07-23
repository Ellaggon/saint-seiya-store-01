import type { APIRoute } from "astro";

import { failure, success } from "@/endpoints/api/shared/api-response";
import { ApplicationError } from "@/endpoints/api/shared/api-errors";
import {
  isJsonObject,
  parseJsonBody,
  type JsonObject,
} from "@/endpoints/api/shared/query";
import { prisma } from "@/infrastructure/database/prisma";
import { resolveDisplayAvailability } from "@/shared/catalog/displayAvailability";

const MAX_ITEMS = 50;

type RequestItem = {
  productId: string;
  quantity: number;
};

const parseItems = (body: JsonObject): RequestItem[] => {
  const raw = body.items;
  if (!Array.isArray(raw) || raw.length === 0) {
    throw ApplicationError.validation("items must be a non-empty array");
  }
  if (raw.length > MAX_ITEMS) {
    throw ApplicationError.validation(`items cannot exceed ${MAX_ITEMS}`);
  }

  const items: RequestItem[] = [];
  for (const entry of raw) {
    if (!isJsonObject(entry)) {
      throw ApplicationError.validation("each item must be an object");
    }
    const productId =
      typeof entry.productId === "string" ? entry.productId.trim() : "";
    if (!productId) {
      throw ApplicationError.validation("productId is required");
    }
    const quantity = Number(entry.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw ApplicationError.validation("quantity must be a positive integer");
    }
    items.push({ productId, quantity });
  }

  return items;
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await parseJsonBody(request);
    const requestItems = parseItems(body);
    const ids = [...new Set(requestItems.map((item) => item.productId))];

    const rows = await prisma.product.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        status: true,
        imageUrl: true,
      },
    });

    const byId = new Map(rows.map((row) => [row.id, row]));

    const items = requestItems.map((requestItem) => {
      const product = byId.get(requestItem.productId);
      if (!product) {
        return {
          productId: requestItem.productId,
          found: false,
          name: null,
          imageUrl: null,
          price: null,
          stock: 0,
          canPurchase: false,
          availabilityLabel: "No disponible",
          requestedQuantity: requestItem.quantity,
          quantityOk: false,
        };
      }

      const availability = resolveDisplayAvailability({
        status: product.status,
        stock: product.stock,
        preorder: null,
      });
      const stock = product.stock;
      const canPurchase = availability.canPurchase && stock > 0;

      return {
        productId: product.id,
        found: true,
        name: product.name,
        imageUrl: product.imageUrl,
        price: Number(product.price),
        stock,
        canPurchase,
        availabilityLabel: availability.label,
        requestedQuantity: requestItem.quantity,
        quantityOk: canPurchase && requestItem.quantity <= stock,
      };
    });

    return success({ items });
  } catch (error) {
    return failure(error);
  }
};
