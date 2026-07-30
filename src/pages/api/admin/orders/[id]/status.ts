import type { APIRoute } from "astro";

import {
  orderInclude,
  serializeOrder,
} from "@/application/orders/serializeOrder";
import { failure, success } from "@/endpoints/api/shared/api-response";
import { ApplicationError } from "@/endpoints/api/shared/api-errors";
import { requireAdmin } from "@/endpoints/api/shared/auth";
import {
  optionalString,
  parseJsonBody,
} from "@/endpoints/api/shared/query";
import { prisma } from "@/infrastructure/database/prisma";
import type { OrderStatus } from "@prisma/client";

type StatusAction =
  | "confirm_payment"
  | "reject_proof"
  | "ship"
  | "deliver"
  | "cancel";

const parseAction = (value: unknown): StatusAction => {
  if (
    value === "confirm_payment" ||
    value === "reject_proof" ||
    value === "ship" ||
    value === "deliver" ||
    value === "cancel"
  ) {
    return value;
  }
  throw ApplicationError.validation("Invalid action");
};

export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    const admin = requireAdmin(locals);
    const id = params.id;
    if (!id) throw ApplicationError.validation("Order id is required");

    const body = await parseJsonBody(request);
    const action = parseAction(body.action);
    const adminNote = optionalString(body.adminNote) ?? null;
    const shippingTrackerId = optionalString(body.shippingTrackerId) ?? null;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        payments: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!order) throw ApplicationError.notFound("Order", id);

    const payment = order.payments[0] ?? null;
    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      let nextStatus: OrderStatus = order.status;

      if (action === "confirm_payment") {
        if (
          order.status !== "AWAITING_PAYMENT" &&
          order.status !== "PAYMENT_REVIEW" &&
          order.status !== "PENDING"
        ) {
          throw ApplicationError.validation(
            "Solo se puede confirmar pago en pedidos pendientes de pago",
          );
        }
        nextStatus = "PAID";
        if (payment) {
          await tx.orderPayment.update({
            where: { id: payment.id },
            data: {
              status: "PAID",
              paidAt: now,
              reviewedAt: now,
              reviewedBy: admin.id,
              adminNote,
            },
          });
        }

        // Decrement stock once when payment is confirmed.
        for (const item of order.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { stock: true },
          });
          if (!product) continue;
          const nextStock = Math.max(0, product.stock - item.quantity);
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: nextStock,
              ...(nextStock === 0 ? { status: "OUT_OF_STOCK" as const } : {}),
            },
          });
        }
      } else if (action === "reject_proof") {
        if (order.status !== "PAYMENT_REVIEW") {
          throw ApplicationError.validation(
            "Solo se puede rechazar comprobantes en revisión",
          );
        }
        nextStatus = "AWAITING_PAYMENT";
        if (payment) {
          await tx.orderPayment.update({
            where: { id: payment.id },
            data: {
              status: "REJECTED",
              reviewedAt: now,
              reviewedBy: admin.id,
              adminNote: adminNote ?? "Comprobante rechazado",
              proofUrl: null,
              proofUploadedAt: null,
            },
          });
        }
      } else if (action === "ship") {
        if (order.status !== "PAID" && order.status !== "SHIPPED") {
          throw ApplicationError.validation(
            "Solo se pueden enviar pedidos pagados",
          );
        }
        nextStatus = "SHIPPED";
      } else if (action === "deliver") {
        if (order.status !== "SHIPPED" && order.status !== "PAID") {
          throw ApplicationError.validation(
            "Solo se pueden marcar entregados pedidos enviados o pagados",
          );
        }
        nextStatus = "DELIVERED";
      } else if (action === "cancel") {
        if (
          order.status === "SHIPPED" ||
          order.status === "DELIVERED" ||
          order.status === "CANCELED"
        ) {
          throw ApplicationError.validation(
            "No se puede cancelar este pedido en su estado actual",
          );
        }
        nextStatus = "CANCELED";
        if (payment && payment.status !== "PAID") {
          await tx.orderPayment.update({
            where: { id: payment.id },
            data: {
              status: "CANCELED",
              reviewedAt: now,
              reviewedBy: admin.id,
              adminNote,
            },
          });
        }
      }

      return tx.order.update({
        where: { id: order.id },
        data: {
          status: nextStatus,
          ...(action === "ship" && shippingTrackerId
            ? { shippingTrackerId }
            : {}),
          ...(action === "ship" && !shippingTrackerId && body.shippingTrackerId === ""
            ? { shippingTrackerId: null }
            : {}),
        },
        include: orderInclude,
      });
    });

    return success({ order: serializeOrder(updated) });
  } catch (error) {
    return failure(error);
  }
};
