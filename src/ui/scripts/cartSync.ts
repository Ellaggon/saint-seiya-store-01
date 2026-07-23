import {
  clearCart,
  readCart,
  replaceCart,
  syncCartBadge,
  type CartItem,
} from "@/ui/scripts/cart";
import { supabase } from "@/lib/supabaseClient";

type SyncResponseItem = {
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
  stock: number;
  canPurchase?: boolean;
};

const toCartItems = (items: SyncResponseItem[]): CartItem[] =>
  items.map((item) => ({
    productId: item.productId,
    name: item.name,
    price: item.price,
    imageUrl: item.imageUrl,
    quantity: item.quantity,
    stock: item.stock,
  }));

export const hasAuthSession = async (): Promise<boolean> => {
  try {
    const { data } = await supabase.auth.getSession();
    return Boolean(data.session?.user);
  } catch {
    return false;
  }
};

/**
 * Merge remote hydrated lines into local cart without dropping local-only rows.
 * Remote wins on overlapping productIds (fresher price/stock/name).
 */
const mergeLocalWithRemote = (
  local: CartItem[],
  remote: CartItem[],
): CartItem[] => {
  const map = new Map<string, CartItem>();
  for (const item of local) map.set(item.productId, item);
  for (const item of remote) map.set(item.productId, item);
  return [...map.values()];
};

/**
 * For replace pushes: refresh local rows from remote hydration, keep any
 * local row the server did not return (e.g. temporarily missing product).
 */
const reconcileReplace = (
  local: CartItem[],
  remote: CartItem[],
): CartItem[] => {
  if (remote.length === 0 && local.length > 0) return local;
  const remoteById = new Map(remote.map((item) => [item.productId, item]));
  return local.map((item) => remoteById.get(item.productId) ?? item);
};

export const syncCartWithServer = async (
  mode: "merge" | "replace" = "merge",
): Promise<CartItem[] | null> => {
  const loggedIn = await hasAuthSession();
  if (!loggedIn) return null;

  const local = readCart();
  const response = await fetch("/api/cart/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      mode,
      items: local.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    }),
  });

  if (response.status === 401) return null;
  if (!response.ok) {
    throw new Error("No se pudo sincronizar el carrito");
  }

  const payload = (await response.json()) as {
    data?: { items?: SyncResponseItem[] };
  };
  const remote = toCartItems(payload.data?.items ?? []);

  // Safety: never blank a non-empty local cart with an empty server payload.
  if (remote.length === 0 && local.length > 0) {
    syncCartBadge();
    return local;
  }

  const next =
    mode === "merge"
      ? mergeLocalWithRemote(local, remote)
      : reconcileReplace(local, remote);

  replaceCart(next, { silent: true });
  syncCartBadge();

  // Notify cart page to re-render after silent write.
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("sanctuary:cart-updated"));
  }

  return next;
};

export const createCheckoutOrder = async (
  items: CartItem[],
): Promise<{
  id: string;
  totalAmount: number;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }>;
} | null> => {
  const loggedIn = await hasAuthSession();
  if (!loggedIn) return null;

  const response = await fetch("/api/orders/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    }),
  });

  if (response.status === 401) return null;
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(
      payload?.error?.message || "No se pudo crear el pedido",
    );
  }

  const payload = (await response.json()) as {
    data?: {
      order?: {
        id: string;
        totalAmount: number;
        items: Array<{
          productId: string;
          name: string;
          quantity: number;
          price: number;
        }>;
      };
    };
  };

  const order = payload.data?.order;
  if (!order) throw new Error("Respuesta de pedido inválida");

  clearCart();
  syncCartBadge();
  return order;
};

let pushTimer: number | undefined;
let syncing = false;

/** Debounced replace-sync while the user is logged in. */
export const scheduleCartServerPush = (): void => {
  if (typeof window === "undefined" || syncing) return;
  window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => {
    void (async () => {
      if (syncing) return;
      syncing = true;
      try {
        await syncCartWithServer("replace");
      } catch {
        // Ignore background sync failures (offline / guest).
      } finally {
        syncing = false;
      }
    })();
  }, 600);
};

export const initCartServerSync = (): void => {
  if (typeof window === "undefined") return;
  const w = window as Window & { __sanctuaryCartServerSync?: boolean };
  if (w.__sanctuaryCartServerSync) return;
  w.__sanctuaryCartServerSync = true;

  void (async () => {
    const loggedIn = await hasAuthSession();
    if (!loggedIn) return;
    syncing = true;
    try {
      await syncCartWithServer("merge");
    } catch {
      // ignore
    } finally {
      syncing = false;
    }
  })();

  window.addEventListener("sanctuary:cart-updated", () => {
    if (syncing) return;
    scheduleCartServerPush();
  });
};
