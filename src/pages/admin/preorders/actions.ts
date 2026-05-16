import type { APIRoute } from "astro";

type JsonBody = Record<string, string | number | boolean | null>;

const text = (formData: FormData, key: string): string =>
  String(formData.get(key) ?? "").trim();

const optionalText = (formData: FormData, key: string): string | null => {
  const value = text(formData, key);
  return value.length > 0 ? value : null;
};

const numberValue = (formData: FormData, key: string): number =>
  Number(text(formData, key));

const booleanValue = (formData: FormData, key: string): boolean =>
  formData.get(key) === "on" || formData.get(key) === "true";

const apiFetch = (
  request: Request,
  path: string,
  init: RequestInit,
): Promise<Response> => {
  const url = new URL(path, request.url);
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      cookie: request.headers.get("cookie") ?? "",
      ...(init.headers ?? {}),
    },
  });
};

const redirectTo = (request: Request, path: string): Response =>
  Response.redirect(new URL(path, request.url), 303);

const redirectWithError = async (
  request: Request,
  path: string,
  response: Response,
): Promise<Response> => {
  const body = (await response.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  const url = new URL(path, request.url);
  url.searchParams.set(
    "error",
    body?.error?.message ?? "Preorder admin action failed",
  );
  return Response.redirect(url, 303);
};

const campaignBody = (formData: FormData): JsonBody => ({
  productId: text(formData, "productId"),
  totalSlots: numberValue(formData, "totalSlots"),
  depositType: text(formData, "depositType"),
  depositValue: numberValue(formData, "depositValue"),
  allowFullPayment: booleanValue(formData, "allowFullPayment"),
  opensAt: optionalText(formData, "opensAt"),
  closesAt: optionalText(formData, "closesAt"),
  releaseDate: optionalText(formData, "releaseDate"),
  etaStart: optionalText(formData, "etaStart"),
  etaEnd: optionalText(formData, "etaEnd"),
  etaLabel: optionalText(formData, "etaLabel"),
  terms: optionalText(formData, "terms"),
  arrivalNotes: optionalText(formData, "arrivalNotes"),
});

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const action = text(formData, "_action");
  const id = text(formData, "id");

  if (action === "create") {
    const response = await apiFetch(request, "/api/admin/preorders", {
      method: "POST",
      body: JSON.stringify(campaignBody(formData)),
    });

    if (!response.ok) return redirectWithError(request, "/admin/preorders/new", response);
    return redirectTo(request, "/admin/preorders");
  }

  if (action === "update") {
    const response = await apiFetch(request, `/api/admin/preorders/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        ...campaignBody(formData),
        status: text(formData, "status"),
      }),
    });

    if (!response.ok) {
      return redirectWithError(request, `/admin/preorders/${id}`, response);
    }
    return redirectTo(request, `/admin/preorders/${id}`);
  }

  if (action === "close") {
    const response = await apiFetch(request, `/api/admin/preorders/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status: "CLOSED" }),
    });
    if (!response.ok) return redirectWithError(request, "/admin/preorders", response);
    return redirectTo(request, "/admin/preorders");
  }

  if (action === "archive") {
    const response = await apiFetch(request, `/api/admin/preorders/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) return redirectWithError(request, "/admin/preorders", response);
    return redirectTo(request, "/admin/preorders");
  }

  if (action === "arrive") {
    const response = await apiFetch(request, `/api/admin/preorders/${id}/arrive`, {
      method: "POST",
    });
    if (!response.ok) return redirectWithError(request, "/admin/preorders", response);
    return redirectTo(request, "/admin/preorders");
  }

  if (action === "cancelReservation") {
    const reservationId = text(formData, "reservationId");
    const response = await apiFetch(
      request,
      `/api/admin/preorders/${id}/reservations/${reservationId}/cancel`,
      { method: "POST" },
    );
    if (!response.ok) {
      return redirectWithError(request, `/admin/preorders/${id}/reservations`, response);
    }
    return redirectTo(request, `/admin/preorders/${id}/reservations`);
  }

  if (action === "manualPayment") {
    const reservationId = text(formData, "reservationId");
    const response = await apiFetch(
      request,
      `/api/admin/preorders/${id}/reservations/${reservationId}/payments`,
      {
        method: "POST",
        body: JSON.stringify({
          kind: text(formData, "kind"),
          amount: numberValue(formData, "amount"),
          paidAt: optionalText(formData, "paidAt"),
        }),
      },
    );
    if (!response.ok) {
      return redirectWithError(request, `/admin/preorders/${id}/reservations`, response);
    }
    return redirectTo(request, `/admin/preorders/${id}/reservations`);
  }

  return redirectWithError(
    request,
    "/admin/preorders",
    new Response(JSON.stringify({ error: { message: "Unknown preorder action" } }), {
      status: 400,
    }),
  );
};
