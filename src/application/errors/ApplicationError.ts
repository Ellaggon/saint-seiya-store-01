export type ApplicationErrorCode =
  | "PRODUCT_NOT_FOUND"
  | "INVALID_DEPOSIT"
  | "PREORDER_ALREADY_EXISTS"
  | "PREORDER_CLOSED"
  | "PREORDER_SOLD_OUT"
  | "LIMIT_EXCEEDED"
  | "DUPLICATE_RESERVATION"
  | "UNAUTHORIZED"
  | "RESERVATION_NOT_FOUND"
  | "INVALID_RESERVATION_STATE"
  | "PAYMENT_EXCEEDS_BALANCE"
  | "FORBIDDEN"
  | "INVALID_PREORDER_STATE";

export class ApplicationError extends Error {
  constructor(
    public readonly code: ApplicationErrorCode,
    message: string,
    public readonly statusCode: number,
    public readonly details?: Record<string, string | number | boolean | null>,
  ) {
    super(message);
    this.name = "ApplicationError";
  }

  static productNotFound(productId: string): ApplicationError {
    return new ApplicationError("PRODUCT_NOT_FOUND", "Product not found", 404, {
      productId,
    });
  }

  static invalidDeposit(message: string): ApplicationError {
    return new ApplicationError("INVALID_DEPOSIT", message, 422);
  }

  static preorderAlreadyExists(productId: string): ApplicationError {
    return new ApplicationError(
      "PREORDER_ALREADY_EXISTS",
      "Product already has an active preorder campaign",
      409,
      { productId },
    );
  }

  static preorderClosed(preorderId: string): ApplicationError {
    return new ApplicationError("PREORDER_CLOSED", "Preorder is not open", 409, {
      preorderId,
    });
  }

  static preorderSoldOut(preorderId: string): ApplicationError {
    return new ApplicationError("PREORDER_SOLD_OUT", "Preorder is sold out", 409, {
      preorderId,
    });
  }

  static limitExceeded(message: string): ApplicationError {
    return new ApplicationError("LIMIT_EXCEEDED", message, 409);
  }

  static duplicateReservation(preorderId: string): ApplicationError {
    return new ApplicationError(
      "DUPLICATE_RESERVATION",
      "User already has an active preorder reservation",
      409,
      { preorderId },
    );
  }

  static unauthorized(): ApplicationError {
    return new ApplicationError("UNAUTHORIZED", "Authentication is required", 401);
  }

  static reservationNotFound(reservationId: string): ApplicationError {
    return new ApplicationError(
      "RESERVATION_NOT_FOUND",
      "Preorder reservation not found",
      404,
      { reservationId },
    );
  }

  static invalidReservationState(message: string): ApplicationError {
    return new ApplicationError("INVALID_RESERVATION_STATE", message, 409);
  }

  static paymentExceedsBalance(): ApplicationError {
    return new ApplicationError(
      "PAYMENT_EXCEEDS_BALANCE",
      "Payment exceeds preorder reservation balance",
      422,
    );
  }

  static forbidden(): ApplicationError {
    return new ApplicationError("FORBIDDEN", "Operation is not allowed", 403);
  }

  static invalidPreorderState(message: string): ApplicationError {
    return new ApplicationError("INVALID_PREORDER_STATE", message, 409);
  }
}
