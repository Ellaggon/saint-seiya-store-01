export type PreorderRepositoryErrorCode =
  | "CAMPAIGN_NOT_FOUND"
  | "DUPLICATE_ACTIVE_CAMPAIGN"
  | "DUPLICATE_RESERVATION"
  | "CAMPAIGN_NOT_RESERVABLE"
  | "SOLD_OUT"
  | "RESERVATION_NOT_FOUND"
  | "DUPLICATE_PAYMENT"
  | "PAYMENT_EXCEEDS_BALANCE"
  | "INVALID_PAYMENT"
  | "INVALID_RESERVATION_STATE";

export class PreorderRepositoryError extends Error {
  constructor(
    public readonly code: PreorderRepositoryErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PreorderRepositoryError";
  }
}

export const isPreorderRepositoryError = (
  error: unknown,
): error is PreorderRepositoryError =>
  error instanceof PreorderRepositoryError;
