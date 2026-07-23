import { prisma } from "@/infrastructure/database/prisma";
import { resolveDisplayAvailability } from "@/shared/catalog/displayAvailability";

export type CartQtyLine = {
  productId: string;
  quantity: number;
};

export type HydratedCartLine = {
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
  stock: number;
  canPurchase: boolean;
  availabilityLabel: string;
  found: boolean;
};

const MAX_LINES = 50;

export const parseCartQtyLines = (value: unknown): CartQtyLine[] => {
  if (!Array.isArray(value)) return [];
  const lines: CartQtyLine[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const productId =
      typeof (entry as { productId?: unknown }).productId === "string"
        ? (entry as { productId: string }).productId.trim()
        : "";
    const quantity = Number((entry as { quantity?: unknown }).quantity);
    if (!productId || !Number.isInteger(quantity) || quantity <= 0) continue;
    lines.push({ productId, quantity });
    if (lines.length >= MAX_LINES) break;
  }
  return lines;
};

export const mergeCartQtyLines = (
  local: CartQtyLine[],
  server: CartQtyLine[],
): CartQtyLine[] => {
  // Use max — not sum. Local and server usually mirror the same cart after sync;
  // summing double-counts (e.g. Alpha 1 local + 1 server → 2).
  const map = new Map<string, number>();
  for (const line of [...server, ...local]) {
    const current = map.get(line.productId) ?? 0;
    map.set(line.productId, Math.max(current, line.quantity));
  }
  return [...map.entries()].map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
};

export const hydrateCartLines = async (
  lines: CartQtyLine[],
): Promise<HydratedCartLine[]> => {
  if (lines.length === 0) return [];

  const ids = [...new Set(lines.map((line) => line.productId))];
  const rows = await prisma.product.findMany({
    where: { id: { in: ids }, deletedAt: null },
    select: {
      id: true,
      name: true,
      price: true,
      stock: true,
      status: true,
      imageUrl: true,
    },
  });
  const byId = new Map(rows.map((row) => [row.id, row]));

  return lines.map((line) => {
    const product = byId.get(line.productId);
    if (!product) {
      return {
        productId: line.productId,
        name: "Producto no disponible",
        price: 0,
        imageUrl: "",
        quantity: line.quantity,
        stock: 0,
        canPurchase: false,
        availabilityLabel: "No disponible",
        found: false,
      };
    }

    const availability = resolveDisplayAvailability({
      status: product.status,
      stock: product.stock,
      preorder: null,
    });
    const stock = product.stock;
    const canPurchase = availability.canPurchase && stock > 0;
    const quantity = canPurchase
      ? Math.min(line.quantity, stock)
      : Math.max(1, line.quantity);

    return {
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      imageUrl: product.imageUrl,
      quantity,
      stock,
      canPurchase,
      availabilityLabel: availability.label,
      found: true,
    };
  });
};

export const toPersistedCartJson = (
  lines: HydratedCartLine[] | CartQtyLine[],
): CartQtyLine[] =>
  lines
    .filter((line) => line.quantity > 0)
    .map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
    }));

export const readUserCartJson = async (
  userId: string,
): Promise<CartQtyLine[]> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { cartJson: true },
  });
  return parseCartQtyLines(user?.cartJson);
};

export const writeUserCartJson = async (
  userId: string,
  lines: CartQtyLine[],
): Promise<void> => {
  await prisma.user.update({
    where: { id: userId },
    data: { cartJson: toPersistedCartJson(lines) },
  });
};
