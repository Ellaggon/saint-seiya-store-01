export type CartItem = {
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
  /** Max purchasable units known at last add/revalidation. */
  stock: number;
};

export type CartMutationResult = {
  items: CartItem[];
  quantityApplied: number;
  capped: boolean;
};

export type CartValidationIssue =
  | "not_found"
  | "unavailable"
  | "out_of_stock"
  | "qty_exceeds";

export type CartLineView = CartItem & {
  canPurchase: boolean;
  availabilityLabel: string;
  issue: CartValidationIssue | null;
  priceChanged: boolean;
};

export type CartValidateApiItem = {
  productId: string;
  found: boolean;
  name: string | null;
  imageUrl: string | null;
  price: number | null;
  stock: number;
  canPurchase: boolean;
  availabilityLabel: string;
  requestedQuantity: number;
  quantityOk: boolean;
};

const CART_STORAGE_KEY = "sanctuary.cart.v1";
export const CART_UPDATED_EVENT = "sanctuary:cart-updated";
const FALLBACK_MAX_QTY = 99;

const canUseStorage = (): boolean =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const normalizeStock = (value: unknown): number => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
};

const normalizeItem = (raw: Partial<CartItem> & { productId?: string }): CartItem | null => {
  if (!raw.productId || typeof raw.productId !== "string") return null;
  const quantity = Math.max(1, Math.floor(Number(raw.quantity) || 1));
  const stock =
    raw.stock === undefined || raw.stock === null
      ? FALLBACK_MAX_QTY
      : normalizeStock(raw.stock);
  return {
    productId: raw.productId,
    name: typeof raw.name === "string" ? raw.name : "Producto",
    price: Number.isFinite(Number(raw.price)) ? Number(raw.price) : 0,
    imageUrl: typeof raw.imageUrl === "string" ? raw.imageUrl : "",
    quantity: Math.min(quantity, Math.max(stock, 1)),
    stock,
  };
};

export const readCart = (): CartItem[] => {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => normalizeItem(entry as Partial<CartItem>))
      .filter((entry): entry is CartItem => entry !== null);
  } catch {
    return [];
  }
};

const writeCart = (items: CartItem[]): void => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
};

/** Replace without notifying listeners (used by server sync to avoid loops). */
const writeCartSilent = (items: CartItem[]): void => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
};

export const getCartItemCount = (items: CartItem[] = readCart()): number =>
  items.reduce((total, item) => total + item.quantity, 0);

export const getItemMaxQuantity = (item: Pick<CartItem, "stock">): number =>
  Math.max(0, normalizeStock(item.stock));

export const addToCart = (
  item: Omit<CartItem, "quantity" | "stock"> & {
    quantity?: number;
    stock?: number;
  },
): CartMutationResult => {
  const stock = normalizeStock(item.stock ?? FALLBACK_MAX_QTY);
  const requested = Math.max(1, Math.floor(item.quantity ?? 1));
  const current = readCart();
  const existing = current.find((entry) => entry.productId === item.productId);

  if (stock <= 0) {
    return { items: current, quantityApplied: 0, capped: true };
  }

  if (existing) {
    const nextQty = Math.min(existing.quantity + requested, stock);
    const capped = existing.quantity + requested > stock;
    const next = current.map((entry) =>
      entry.productId === item.productId
        ? {
            ...entry,
            name: item.name,
            price: item.price,
            imageUrl: item.imageUrl,
            stock,
            quantity: nextQty,
          }
        : entry,
    );
    writeCart(next);
    return {
      items: next,
      quantityApplied: nextQty - existing.quantity,
      capped,
    };
  }

  const quantity = Math.min(requested, stock);
  const next = [
    ...current,
    {
      productId: item.productId,
      name: item.name,
      price: item.price,
      imageUrl: item.imageUrl,
      quantity,
      stock,
    },
  ];
  writeCart(next);
  return {
    items: next,
    quantityApplied: quantity,
    capped: requested > stock,
  };
};

export const setItemQuantity = (
  productId: string,
  quantity: number,
): CartMutationResult => {
  if (!productId) {
    return { items: readCart(), quantityApplied: 0, capped: false };
  }
  if (quantity <= 0) {
    const items = removeItem(productId);
    return { items, quantityApplied: 0, capped: false };
  }

  const current = readCart();
  const existing = current.find((entry) => entry.productId === productId);
  if (!existing) {
    return { items: current, quantityApplied: 0, capped: false };
  }

  const max = getItemMaxQuantity(existing);
  if (max <= 0) {
    const items = removeItem(productId);
    return { items, quantityApplied: 0, capped: true };
  }

  const desired = Math.floor(quantity);
  const nextQty = Math.min(desired, max);
  const next = current.map((entry) =>
    entry.productId === productId ? { ...entry, quantity: nextQty } : entry,
  );
  writeCart(next);
  return {
    items: next,
    quantityApplied: nextQty,
    capped: desired > max,
  };
};

export const removeItem = (productId: string): CartItem[] => {
  if (!productId) return readCart();
  const next = readCart().filter((entry) => entry.productId !== productId);
  writeCart(next);
  return next;
};

export const clearCart = (): CartItem[] => {
  writeCart([]);
  return [];
};

export const replaceCart = (
  items: CartItem[],
  options?: { silent?: boolean },
): CartItem[] => {
  const normalized = items
    .map((entry) => normalizeItem(entry))
    .filter((entry): entry is CartItem => entry !== null);
  if (options?.silent) {
    writeCartSilent(normalized);
  } else {
    writeCart(normalized);
  }
  return normalized;
};

export const syncCartBadge = (): void => {
  const count = getCartItemCount();
  document
    .querySelectorAll<HTMLElement>("[data-cart-count]")
    .forEach((badge) => {
      badge.textContent = String(Math.min(count, 99));
      badge.dataset.empty = count === 0 ? "true" : "false";
      badge.setAttribute("aria-hidden", count === 0 ? "true" : "false");
    });
};

let storageSyncBound = false;

/** Sync cart UI across browser tabs via the `storage` event. */
export const initCartStorageSync = (): void => {
  if (typeof window === "undefined" || storageSyncBound) return;
  storageSyncBound = true;
  window.addEventListener("storage", (event) => {
    if (event.key !== CART_STORAGE_KEY) return;
    window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
  });
};

export const applyCartValidation = (
  localItems: CartItem[],
  remoteItems: CartValidateApiItem[],
): { items: CartItem[]; lines: CartLineView[] } => {
  const remoteById = new Map(remoteItems.map((item) => [item.productId, item]));

  const lines: CartLineView[] = localItems.map((local) => {
    const remote = remoteById.get(local.productId);

    if (!remote || !remote.found) {
      return {
        ...local,
        stock: 0,
        canPurchase: false,
        availabilityLabel: "No disponible",
        issue: "not_found",
        priceChanged: false,
      };
    }

    const stock = normalizeStock(remote.stock);
    const price = remote.price ?? local.price;
    const priceChanged = Number(price) !== Number(local.price);
    const canPurchase = Boolean(remote.canPurchase) && stock > 0;

    let quantity = Math.max(1, Math.floor(local.quantity));
    let issue: CartValidationIssue | null = null;

    if (!canPurchase) {
      issue = stock <= 0 ? "out_of_stock" : "unavailable";
    } else if (quantity > stock) {
      quantity = stock;
      issue = "qty_exceeds";
    }

    return {
      productId: local.productId,
      name: remote.name || local.name,
      imageUrl: remote.imageUrl || local.imageUrl,
      price,
      quantity,
      stock,
      canPurchase,
      availabilityLabel: remote.availabilityLabel || "No disponible",
      issue,
      priceChanged,
    };
  });

  const items: CartItem[] = lines.map((line) => ({
    productId: line.productId,
    name: line.name,
    price: line.price,
    imageUrl: line.imageUrl,
    quantity: line.quantity,
    stock: line.stock,
  }));

  return { items, lines };
};

export const validateCartWithServer = async (
  items: CartItem[] = readCart(),
): Promise<{ items: CartItem[]; lines: CartLineView[] }> => {
  if (items.length === 0) {
    return { items: [], lines: [] };
  }

  const response = await fetch("/api/cart/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    }),
  });

  if (!response.ok) {
    throw new Error("No se pudo validar el carrito");
  }

  const payload = (await response.json()) as {
    data?: { items?: CartValidateApiItem[] };
  };
  const remoteItems = payload.data?.items ?? [];
  const result = applyCartValidation(items, remoteItems);
  replaceCart(result.items);
  return result;
};

export const cartHasBlockingIssues = (lines: CartLineView[]): boolean =>
  lines.some(
    (line) =>
      !line.canPurchase ||
      line.issue === "not_found" ||
      line.issue === "unavailable" ||
      line.issue === "out_of_stock",
  );
