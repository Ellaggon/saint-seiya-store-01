import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import type { AstroCookies } from "astro";
import {
  supabasePublishableKey,
  supabaseUrl,
} from "@/lib/supabaseServerEnv";

export const createSupabaseServerClient = (context: {
  cookies: AstroCookies;
  request: Request;
}) => {
  return createServerClient(
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
};

export const getSupabaseUser = async (context: {
  cookies: AstroCookies;
  request: Request;
}) => {
  const supabase = createSupabaseServerClient(context);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
};
