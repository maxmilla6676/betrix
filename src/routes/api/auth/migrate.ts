import { createFileRoute } from "@tanstack/react-router";
import { clientIp, handle, json, rateLimit, readJson } from "@/server/http";
import { migrateLegacyAccount } from "@/server/accounts";

/** Called before sign-in: upgrades pre-Supabase-Auth accounts and returns the login email. */
export const Route = createFileRoute("/api/auth/migrate")({
  server: {
    handlers: {
      POST: handle(async ({ request }) => {
        const body = await readJson(request);
        rateLimit(`login:${clientIp(request)}`, 20, 15 * 60_000);
        rateLimit(`login-phone:${String(body["phone"] || "")}`, 10, 15 * 60_000);
        return json(await migrateLegacyAccount(body));
      }),
    },
  },
});
