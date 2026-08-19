import { randomBytes } from "node:crypto";

/** Short human-friendly order reference for bank transfer concept field. */
export const generateOrderReferenceCode = (): string => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[bytes[i]! % alphabet.length];
  }
  return `SAN-${code}`;
};

/** Opaque token for guest order access (pay page without login). */
export const generateGuestAccessToken = (): string =>
  randomBytes(24).toString("hex");
