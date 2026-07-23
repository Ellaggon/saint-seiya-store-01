import type { APIRoute } from "astro";

import {
  hydrateCartLines,
  mergeCartQtyLines,
  parseCartQtyLines,
  readUserCartJson,
  writeUserCartJson,
  type CartQtyLine,
} from "@/application/cart/serverCart";
import { failure, success } from "@/endpoints/api/shared/api-response";
import { ApplicationError } from "@/endpoints/api/shared/api-errors";
import { requireUser } from "@/endpoints/api/shared/auth";
import {
  isJsonObject,
  parseJsonBody,
  type JsonObject,
} from "@/endpoints/api/shared/query";

const parseIncomingItems = (body: JsonObject): CartQtyLine[] => {
  const raw = body.items;
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    throw ApplicationError.validation("items must be an array");
  }
  return parseCartQtyLines(raw);
};

const parseMode = (body: JsonObject): "merge" | "replace" => {
  const mode = body.mode;
  if (mode === undefined || mode === "merge") return "merge";
  if (mode === "replace") return "replace";
  throw ApplicationError.validation('mode must be "merge" or "replace"');
};

export const GET: APIRoute = async ({ locals }) => {
  try {
    const user = requireUser(locals);
    const serverLines = await readUserCartJson(user.id);
    const items = await hydrateCartLines(serverLines);
    return success({ items, mode: "server" as const });
  } catch (error) {
    return failure(error);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const user = requireUser(locals);
    const body = await parseJsonBody(request);
    const mode = parseMode(body);
    const localLines = parseIncomingItems(body);
    const serverLines = await readUserCartJson(user.id);

    const merged =
      mode === "replace"
        ? localLines
        : mergeCartQtyLines(localLines, serverLines);

    const items = await hydrateCartLines(merged);

    // Persist only purchasable lines server-side.
    const persist = items
      .filter((item) => item.found && item.canPurchase && item.stock > 0)
      .map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }));

    await writeUserCartJson(user.id, persist);

    // Return every found line (including unavailable) so the client never
    // wipes localStorage when stock/status temporarily blocks purchase.
    return success({
      items: items.filter((item) => item.found),
      mode,
    });
  } catch (error) {
    return failure(error);
  }
};
