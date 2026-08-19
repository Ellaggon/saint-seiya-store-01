import type { APIRoute } from "astro";

import { serializeOrder } from "@/application/orders/serializeOrder";
import { listAdminOrders } from "@/application/orders/adminOrderQueries";
import { failure, success } from "@/endpoints/api/shared/api-response";
import { requireAdmin } from "@/endpoints/api/shared/auth";
import type { OrderStatus } from "@prisma/client";

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    requireAdmin(locals);

    const statusParam = url.searchParams.get("status");
    const q = url.searchParams.get("q")?.trim() ?? "";

    const orders = await listAdminOrders({
      status: statusParam && statusParam !== "ALL" ? statusParam as OrderStatus : undefined,
      q,
    });

    return success({
      orders: orders.map((order) => serializeOrder(order)),
    });
  } catch (error) {
    return failure(error);
  }
};
