// import { createClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

// const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
// const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
//   auth: {
//     flowType: "pkce",
//     persistSession: true,
//     detectSessionInUrl: true,
//   },
// });

export const supabase = createBrowserClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
);
