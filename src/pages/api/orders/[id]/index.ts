import type { APIRoute } from "astro";

import {
  orderInclude,
  serializeOrder,
} from "@/application/orders/serializeOrder";
import { failure, success } from "@/endpoints/api/shared/api-response";
import { ApplicationError } from "@/endpoints/api/shared/api-errors";
import { prisma } from "@/infrastructure/database/prisma";

const canAccessOrder = (
  order: {
    userId: string | null;
    guestAccessToken: string | null;
  },
  locals: App.Locals,
  token: string | null,
): boolean => {
  if (locals.user?.role === "ADMIN") return true;
  if (locals.user?.id && order.userId === locals.user.id) return true;
  if (token && order.guestAccessToken && token === order.guestAccessToken) {
    return true;
  }
  return false;
};

export const GET: APIRoute = async ({ params, url, locals }) => {
  try {
    const id = params.id;
    if (!id) throw ApplicationError.validation("Order id is required");

    const token = url.searchParams.get("token");
    const order = await prisma.order.findUnique({
      where: { id },
      include: orderInclude,
    });

    if (!order) throw ApplicationError.notFound("Order", id);
    if (!canAccessOrder(order, locals, token)) {
      throw ApplicationError.forbidden();
    }

    return success({
      order: serializeOrder(order, {
        includeGuestToken: Boolean(
          !locals.user && token && order.guestAccessToken === token,
        ),
      }),
    });
  } catch (error) {
    return failure(error);
  }
};
