import { createFileRoute } from "@tanstack/react-router";
import { HttpError, handle, json, rateLimit } from "@/server/http";
import { requireUser } from "@/server/auth";
import { serverEnv } from "@/server/env";
import { settlePending } from "@/server/bets";

/**
 * POST (logged in): settle the caller's finished bets; admins settle everyone's.
 * GET with `Authorization: Bearer $CRON_SECRET`: settle everyone's (for a scheduler).
 */
export const Route = createFileRoute("/api/bets/settle")({
  server: {
    handlers: {
      POST: handle(async ({ request }) => {
        const user = await requireUser(request);
        rateLimit(`settle:${user.profileId}`, 6, 60_000);
        const all =
          user.role === "ADMIN" && new URL(request.url).searchParams.get("scope") === "all";
        return json(await settlePending(all ? { limit: 50 } : { phone: user.phone }));
      }),
      GET: handle(async ({ request }) => {
        const { cronSecret } = serverEnv();
        if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
          throw new HttpError(401, "Unauthorized");
        }
        return json(await settlePending({ limit: 50 }));
      }),
    },
  },
});
