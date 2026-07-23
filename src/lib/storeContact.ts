import { absoluteSiteUrl } from "@/lib/siteUrl";

/**
 * Store contact channels for checkout and footer social links.
 * Configure via PUBLIC_* env vars so the same values work in browser and SSR.
 */
const trim = (value: string | undefined): string => value?.trim() ?? "";

/** Digits-only WhatsApp number, e.g. 59170000000 */
export const storeWhatsAppNumber = trim(
  import.meta.env.PUBLIC_WHATSAPP_NUMBER,
);

/** Full Messenger deep link, e.g. https://m.me/sanctuary */
export const storeMessengerUrl = trim(import.meta.env.PUBLIC_MESSENGER_URL);

/** Optional Facebook page URL for footer */
export const storeFacebookUrl =
  trim(import.meta.env.PUBLIC_FACEBOOK_URL) || storeMessengerUrl;

export const isWhatsAppConfigured = (): boolean =>
  Boolean(trim(import.meta.env.PUBLIC_WHATSAPP_URL) || storeWhatsAppNumber);

export const buildWhatsAppUrl = (message?: string): string => {
  const configured = trim(import.meta.env.PUBLIC_WHATSAPP_URL);
  if (configured) {
    if (!message) return configured;
    const separator = configured.includes("?") ? "&" : "?";
    return `${configured}${separator}text=${encodeURIComponent(message)}`;
  }

  if (!storeWhatsAppNumber) {
    return message
      ? `https://wa.me/?text=${encodeURIComponent(message)}`
      : "https://wa.me/";
  }

  const base = `https://wa.me/${storeWhatsAppNumber.replace(/\D/g, "")}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
};

const formatBob = (value: number): string =>
  `Bs ${value.toLocaleString("es-BO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

export type CartCheckoutCustomer = {
  name?: string;
  city?: string;
  note?: string;
  orderId?: string;
};

export type CartCheckoutLine = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

export const buildCartCheckoutMessage = (
  items: CartCheckoutLine[],
  customer: CartCheckoutCustomer = {},
): string => {
  const lines = items.map((item, index) => {
    const lineTotal = item.price * item.quantity;
    const link = absoluteSiteUrl(`/product/${item.productId}`);
    return `${index + 1}. ${item.name}
   ×${item.quantity} · ${formatBob(item.price)} c/u = ${formatBob(lineTotal)}
   ${link}`;
  });

  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const meta: string[] = [];
  if (customer.orderId?.trim()) {
    meta.push(`Pedido: #${customer.orderId.trim().slice(0, 8).toUpperCase()}`);
  }
  if (customer.name?.trim()) meta.push(`Nombre: ${customer.name.trim()}`);
  if (customer.city?.trim()) meta.push(`Ciudad: ${customer.city.trim()}`);
  if (customer.note?.trim()) meta.push(`Nota: ${customer.note.trim()}`);

  return [
    "Hola Sanctuary 👋",
    "Quiero confirmar este pedido:",
    "",
    ...lines,
    "",
    `Total: ${formatBob(total)}`,
    ...(meta.length ? ["", ...meta] : []),
    "",
    "¿Me confirman disponibilidad y forma de pago/envío?",
  ].join("\n");
};
