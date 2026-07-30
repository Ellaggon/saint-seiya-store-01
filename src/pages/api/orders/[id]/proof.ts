import type { APIRoute } from "astro";

import {
  orderInclude,
  serializeOrder,
} from "@/application/orders/serializeOrder";
import { failure, success } from "@/endpoints/api/shared/api-response";
import { ApplicationError } from "@/endpoints/api/shared/api-errors";
import {
  parseJsonBody,
  optionalString,
} from "@/endpoints/api/shared/query";
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

export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    const id = params.id;
    if (!id) throw ApplicationError.validation("Order id is required");

    const body = await parseJsonBody(request);
    const proofUrl = optionalString(body.proofUrl);
    const token = optionalString(body.token) ?? null;

    if (!proofUrl) {
      throw ApplicationError.validation("proofUrl is required");
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { payments: { orderBy: { createdAt: "desc" } } },
    });

    if (!order) throw ApplicationError.notFound("Order", id);
    if (!canAccessOrder(order, locals, token)) {
      throw ApplicationError.forbidden();
    }

    if (
      order.status !== "AWAITING_PAYMENT" &&
      order.status !== "PAYMENT_REVIEW" &&
      order.status !== "PENDING"
    ) {
      throw ApplicationError.validation(
        "Este pedido ya no acepta comprobantes",
      );
    }

    const payment = order.payments[0];
    if (!payment) {
      throw ApplicationError.validation("El pedido no tiene pago asociado");
    }

    if (payment.status === "PAID") {
      throw ApplicationError.validation("Este pago ya fue confirmado");
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.orderPayment.update({
        where: { id: payment.id },
        data: {
          proofUrl,
          proofUploadedAt: new Date(),
          status: "UNDER_REVIEW",
          adminNote: null,
        },
      });

      return tx.order.update({
        where: { id: order.id },
        data: { status: "PAYMENT_REVIEW" },
        include: orderInclude,
      });
    });

    return success({
      order: serializeOrder(updated, {
        includeGuestToken: Boolean(!locals.user && token),
      }),
    });
  } catch (error) {
    return failure(error);
  }
};
