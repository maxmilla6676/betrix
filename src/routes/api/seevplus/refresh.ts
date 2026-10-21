import { createFileRoute } from "@tanstack/react-router";
import { handle, json, rateLimit } from "@/server/http";
import { requireUser } from "@/server/auth";
import { refreshWallet } from "@/server/payments";

/** Re-check the caller's pending deposits and withdrawals with SeevPlus. */
export const Route = createFileRoute("/api/seevplus/refresh")({
  server: {
    handlers: {
      POST: handle(async ({ request }) => {
        const user = await requireUser(request);
        rateLimit(`refresh:${user.profileId}`, 12, 60_000);
        return json(await refreshWallet(user));
      }),
    },
  },
});
