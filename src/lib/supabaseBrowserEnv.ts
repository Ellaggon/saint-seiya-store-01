const supabaseUrl =
  import.meta.env.PUBLIC_SUPABASE_URL ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL;

const supabasePublishableKey =
  import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Missing Supabase public environment variables. Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_PUBLISHABLE_KEY, or the NEXT_PUBLIC_SUPABASE_* aliases.",
  );
}

export { supabasePublishableKey, supabaseUrl };
