import { defineMiddleware } from "astro:middleware";
import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { AuthSyncService } from "./modules/auth/syncService";
import {
  supabasePublishableKey,
  supabaseUrl,
} from "./lib/supabaseServerEnv";

const resolvesUser = (pathname: string): boolean =>
  pathname.startsWith("/admin") ||
  pathname.startsWith("/account") ||
  pathname.startsWith("/checkout") ||
  pathname.startsWith("/orders") ||
  pathname.startsWith("/preorders/reservations") ||
  pathname.startsWith("/api/admin") ||
  pathname.startsWith("/api/upload-") ||
  pathname.startsWith("/api/cart/sync") ||
  pathname.startsWith("/api/orders") ||
  pathname.startsWith("/api/preorders");

const requiresLogin = (pathname: string): boolean =>
  pathname.startsWith("/account");

/** Mutations and APIs should re-validate with Auth; HTML navigations can use the local session JWT. */
const requiresAuthNetworkCheck = (pathname: string, method: string): boolean => {
  if (pathname.startsWith("/api/")) return true;
  if (method !== "GET" && method !== "HEAD") return true;
  return false;
};

export const onRequest = defineMiddleware(async (context, next) => {
  // Public storefront pages don't read locals.user — skip Supabase/Prisma round-trips.
  if (!resolvesUser(context.url.pathname)) {
    context.locals.user = null;
    return next();
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(
            context.request.headers.get("Cookie") ?? "",
          ).map((c) => ({
            name: c.name,
            value: c.value ?? "",
          }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            context.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  let sbUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null =
    null;

  if (requiresAuthNetworkCheck(context.url.pathname, context.request.method)) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (!error && user) sbUser = user;
  } else {
    // Local JWT/session read — avoids an Auth network hop on every admin page click.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    sbUser = session?.user ?? null;
  }

  if (!sbUser) {
    context.locals.user = null;
  } else {
    try {
      const prismaUser = await AuthSyncService.findOrCreateUser({
        id: sbUser.id,
        email: sbUser.email ?? undefined,
        name:
          (typeof sbUser.user_metadata?.full_name === "string"
            ? sbUser.user_metadata.full_name
            : undefined) ||
          (typeof sbUser.user_metadata?.name === "string"
            ? sbUser.user_metadata.name
            : undefined),
      });

      context.locals.user = prismaUser;
    } catch (syncError) {
      console.error("Auth sync failed:", syncError);
      context.locals.user = null;
    }
  }

  if (requiresLogin(context.url.pathname) && !context.locals.user) {
    return context.redirect(
      "/login?returnTo=" + encodeURIComponent(context.url.pathname),
    );
  }

  if (context.url.pathname.startsWith("/admin/")) {
    const user = context.locals.user;

    if (!user) {
      return context.redirect(
        "/login?returnTo=" + encodeURIComponent(context.url.pathname),
      );
    }

    if (user.role !== "ADMIN") {
      return new Response("Forbidden", { status: 403 });
    }
  }

  return next();
});
