import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "./env";
import { HttpError } from "./http";

let client: SupabaseClient | undefined;

/** Service-role Supabase client. Bypasses RLS — server-only. */
export function adminDb(): SupabaseClient {
  if (!client) {
    const { supabaseUrl, supabaseServiceKey } = serverEnv();
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new HttpError(503, "Server is not configured (missing SUPABASE_SERVICE_ROLE_KEY).");
    }
    client = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
