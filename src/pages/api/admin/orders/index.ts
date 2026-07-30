import type { APIRoute } from "astro";

import {
  orderInclude,
  serializeOrder,
} from "@/application/orders/serializeOrder";
import { failure, success } from "@/endpoints/api/shared/api-response";
import { requireAdmin } from "@/endpoints/api/shared/auth";
import { prisma } from "@/infrastructure/database/prisma";
import type { OrderStatus, Prisma } from "@prisma/client";

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    requireAdmin(locals);

    const statusParam = url.searchParams.get("status");
    const q = url.searchParams.get("q")?.trim() ?? "";

    const where: Prisma.OrderWhereInput = {};

    if (statusParam && statusParam !== "ALL") {
      where.status = statusParam as OrderStatus;
    }

    if (q) {
      where.OR = [
        { referenceCode: { contains: q, mode: "insensitive" } },
        { customerName: { contains: q, mode: "insensitive" } },
        { customerPhone: { contains: q, mode: "insensitive" } },
        { id: { contains: q, mode: "insensitive" } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: orderInclude,
    });

    return success({
      orders: orders.map((order) => serializeOrder(order)),
    });
  } catch (error) {
    return failure(error);
  }
};
