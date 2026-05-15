export type ApplicationErrorCode =
  | "VALIDATION_ERROR"
  | "PRODUCT_NOT_FOUND"
  | "INVALID_DEPOSIT"
  | "INVALID_PAYMENT"
  | "INVALID_PAYMENT_MODE"
  | "INVALID_PAYMENT_AMOUNT"
  | "PREORDER_ALREADY_EXISTS"
  | "PREORDER_CLOSED"
  | "PREORDER_SOLD_OUT"
  | "LIMIT_EXCEEDED"
  | "DUPLICATE_RESERVATION"
  | "UNAUTHORIZED"
  | "RESERVATION_NOT_FOUND"
  | "INVALID_RESERVATION_STATE"
  | "PAYMENT_EXCEEDS_BALANCE"
  | "DUPLICATE_PAYMENT"
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

  static validation(message: string): ApplicationError {
    return new ApplicationError("VALIDATION_ERROR", message, 400);
  }

  static productNotFound(productId: string): ApplicationError {
    return new ApplicationError("PRODUCT_NOT_FOUND", "Product not found", 404, {
      productId,
    });
  }

  static invalidDeposit(message: string): ApplicationError {
    return new ApplicationError("INVALID_DEPOSIT", message, 422);
  }

  static invalidPayment(message: string): ApplicationError {
    return new ApplicationError("INVALID_PAYMENT", message, 422);
  }

  static invalidPaymentMode(paymentMode: string): ApplicationError {
    return new ApplicationError(
      "INVALID_PAYMENT_MODE",
      "Invalid preorder payment mode",
      422,
      { paymentMode },
    );
  }

  static invalidPaymentAmount(message: string): ApplicationError {
    return new ApplicationError("INVALID_PAYMENT_AMOUNT", message, 422);
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

  static duplicatePayment(): ApplicationError {
    return new ApplicationError(
      "DUPLICATE_PAYMENT",
      "Payment is already registered",
      409,
    );
  }

  static forbidden(): ApplicationError {
    return new ApplicationError("FORBIDDEN", "Operation is not allowed", 403);
  }

  static invalidPreorderState(message: string): ApplicationError {
    return new ApplicationError("INVALID_PREORDER_STATE", message, 409);
  }

  static normalizeUnknownError(error: unknown): ApplicationError {
    if (error instanceof ApplicationError) return error;

    const message = error instanceof Error ? error.message : "Unexpected error";
    const normalized = message.toLowerCase();

    if (normalized.includes("already has an active preorder reservation")) {
      return new ApplicationError("DUPLICATE_RESERVATION", message, 409);
    }
    if (normalized.includes("sold out") || normalized.includes("available slots")) {
      return new ApplicationError("PREORDER_SOLD_OUT", message, 409);
    }
    if (normalized.includes("cannot accept this reservation")) {
      return new ApplicationError("LIMIT_EXCEEDED", message, 409);
    }
    if (normalized.includes("provider payment is already linked")) {
      return ApplicationError.duplicatePayment();
    }
    if (normalized.includes("payment amount cannot exceed")) {
      return ApplicationError.paymentExceedsBalance();
    }
    if (
      normalized.includes("payment amount must be greater than zero") ||
      normalized.includes("preorder payment amount")
    ) {
      return ApplicationError.invalidPaymentAmount(message);
    }
    if (
      normalized.includes("full payment is not allowed") ||
      normalized.includes("deposit") ||
      normalized.includes("preorder quantity")
    ) {
      return ApplicationError.invalidPayment(message);
    }
    if (
      normalized.includes("inactive preorder reservation") ||
      normalized.includes("paid or fulfilled") ||
      normalized.includes("paid preorder reservation")
    ) {
      return ApplicationError.invalidReservationState(message);
    }
    if (normalized.includes("preorder campaign not found")) {
      return ApplicationError.invalidPreorderState(message);
    }

    return ApplicationError.invalidPreorderState(message);
  }
}
