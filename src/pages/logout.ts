import type { APIRoute } from "astro";
import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import {
  supabasePublishableKey,
  supabaseUrl,
} from "@/lib/supabaseServerEnv";

export const GET: APIRoute = async ({ cookies, redirect, request }) => {
  // We use the server client to sign out and clear cookies
  const supabase = createServerClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get("Cookie") ?? "").map(
            (c) => ({
              name: c.name,
              value: c.value ?? "",
            }),
          );
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.signOut();

  return redirect("/");
};

export const POST: APIRoute = async ({ cookies, redirect, request }) => {
  // Same logic for POST
  const supabase = createServerClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get("Cookie") ?? "").map(
            (c) => ({
              name: c.name,
              value: c.value ?? "",
            }),
          );
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.signOut();

  return redirect("/");
};
