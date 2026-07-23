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
  pathname.startsWith("/api/admin") ||
  pathname.startsWith("/api/upload-") ||
  pathname.startsWith("/api/cart/sync") ||
  pathname.startsWith("/api/orders") ||
  pathname.startsWith("/api/preorders");

const requiresLogin = (pathname: string): boolean =>
  pathname.startsWith("/account");

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

  const {
    data: { user: sbUser },
    error,
  } = await supabase.auth.getUser();

  if (error || !sbUser) {
    context.locals.user = null;
  } else {
    try {
      const prismaUser = await AuthSyncService.findOrCreateUser({
        id: sbUser.id,
        email: sbUser.email,
        name: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name,
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
