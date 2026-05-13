import { defineMiddleware } from "astro:middleware";
import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { AuthSyncService } from "./modules/auth/syncService";
import {
  supabasePublishableKey,
  supabaseUrl,
} from "./lib/supabaseServerEnv";

export const onRequest = defineMiddleware(async (context, next) => {
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
    return next();
  }

  try {
    const prismaUser = await AuthSyncService.findOrCreateUser({
      id: sbUser.id,
      email: sbUser.email,
      name: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name,
    });

    context.locals.user = prismaUser;
  } catch (error) {
    console.error("Auth sync failed:", error);
    context.locals.user = null;
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
