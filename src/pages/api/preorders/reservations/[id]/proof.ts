import type { APIRoute } from "astro";

import { failure, success } from "@/endpoints/api/shared/api-response";
import { ApplicationError } from "@/endpoints/api/shared/api-errors";
import { requireUser } from "@/endpoints/api/shared/auth";
import {
  optionalString,
  parseJsonBody,
} from "@/endpoints/api/shared/query";
import { prisma } from "@/infrastructure/database/prisma";

export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    const user = requireUser(locals);
    const reservationId = params.id;
    if (!reservationId) {
      throw ApplicationError.validation("Reservation id is required");
    }

    const body = await parseJsonBody(request);
    const proofUrl = optionalString(body.proofUrl);
    if (!proofUrl) {
      throw ApplicationError.validation("proofUrl is required");
    }

    const reservation = await prisma.preorderReservation.findUnique({
      where: { id: reservationId },
      include: {
        payments: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!reservation) {
      throw ApplicationError.reservationNotFound(reservationId);
    }

    if (reservation.userId !== user.id && locals.user?.role !== "ADMIN") {
      throw ApplicationError.forbidden();
    }

    const pending = reservation.payments.find((p) => p.status === "PENDING");
    if (!pending) {
      throw ApplicationError.validation(
        "No hay un pago pendiente para esta reserva",
      );
    }

    const metadata: Record<string, string> = {};
    if (typeof pending.metadata === "object" && pending.metadata !== null) {
      for (const [key, value] of Object.entries(
        pending.metadata as Record<string, unknown>,
      )) {
        if (typeof value === "string") metadata[key] = value;
        else if (typeof value === "number" || typeof value === "boolean") {
          metadata[key] = String(value);
        }
      }
    }

    metadata.proofUrl = proofUrl;
    metadata.proofUploadedAt = new Date().toISOString();

    const updated = await prisma.preorderPayment.update({
      where: { id: pending.id },
      data: { metadata },
    });

    return success({
      payment: {
        id: updated.id,
        reservationId: updated.reservationId,
        amount: Number(updated.amount),
        status: updated.status,
        proofUrl,
      },
    });
  } catch (error) {
    return failure(error);
  }
};
