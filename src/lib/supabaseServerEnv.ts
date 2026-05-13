const supabaseUrl =
  import.meta.env.SUPABASE_URL ??
  import.meta.env.PUBLIC_SUPABASE_URL ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL;

const supabasePublishableKey =
  import.meta.env.SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.SUPABASE_ANON_KEY ??
  import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Missing Supabase server environment variables. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY, or compatible public aliases.",
  );
}

export { supabasePublishableKey, supabaseUrl };
