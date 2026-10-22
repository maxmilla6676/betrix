/** Server-only configuration. Never import this from browser code. */
export function serverEnv() {
  const e = process.env;
  return {
    supabaseUrl: e["SUPABASE_URL"] || e["VITE_SUPABASE_URL"] || "",
    supabaseServiceKey: e["SUPABASE_SERVICE_ROLE_KEY"] || "",
    supabaseAnonKey: e["SUPABASE_ANON_KEY"] || e["VITE_SUPABASE_ANON_KEY"] || "",
    seevApiKey: e["SEEV_CHECKOUT_API_KEY"] || e["SEEV_API_KEY"] || "",
    seevWebhookSecret: e["SEEV_WEBHOOK_SECRET"] || "",
    seevBaseUrl: (e["SEEV_BASE_URL"] || "https://api.seevplus.com").replace(/\/+$/, ""),
    seevSubaccount: e["SEEV_SUBACCOUNT_CODE"] || "",
    cronSecret: e["CRON_SECRET"] || "",
  };
}
