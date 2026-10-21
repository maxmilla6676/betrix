import { createClient } from "@supabase/supabase-js";

const env = import.meta.env as Record<string, string | undefined>;
const supabaseUrl = env["VITE_SUPABASE_URL"] || "";
const supabaseAnonKey = env["VITE_SUPABASE_ANON_KEY"] || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set.");
}

/** Browser client: anon key + the signed-in user's session. All access is enforced by RLS. */
export const supabase = createClient(
  supabaseUrl || "http://localhost",
  supabaseAnonKey || "missing-anon-key",
  {
    auth: {
      persistSession: typeof window !== "undefined",
      autoRefreshToken: typeof window !== "undefined",
      storageKey: "betrix.auth",
    },
  },
);
