import { defineMiddleware } from "astro:middleware";
import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { AuthSyncService } from "./modules/auth/syncService";

export const onRequest = defineMiddleware(async (context, next) => {
  // 1. Initialize Supabase Server Client
  const supabase = createServerClient(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_ANON_KEY,
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

  // 2. Validate Session and Get User
  // We use getUser() which is more secure than getSession() as it validates against the server
  const {
    data: { user: sbUser },
    error,
  } = await supabase.auth.getUser();

  if (error || !sbUser) {
    context.locals.user = null;
  } else {
    // 3. Sync with Prisma User Table
    // We only sync if we have a valid Supabase user
    try {
      const prismaUser = await AuthSyncService.syncUser({
        id: sbUser.id,
        email: sbUser.email,
        name: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name,
      });
      context.locals.user = prismaUser;
    } catch (syncError) {
      console.error("Failed to sync user with Prisma:", syncError);
      context.locals.user = null;
    }
  }

  // 4. Protect /admin/* Routes
  if (context.url.pathname.startsWith("/admin")) {
    const user = context.locals.user;

    if (!user) {
      return context.redirect(
        "/login?returnTo=" + encodeURIComponent(context.url.pathname),
      );
    }

    if (user.role !== "ADMIN") {
      // Return 403 Forbidden or redirect
      return new Response("Forbidden: Admin access required", { status: 403 });
    }
  }

  return next();
});
