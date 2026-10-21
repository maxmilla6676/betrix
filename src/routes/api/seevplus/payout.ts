import { createFileRoute } from "@tanstack/react-router";
import { handle, json, rateLimit, readJson } from "@/server/http";
import { requireUser } from "@/server/auth";
import { requestWithdrawal } from "@/server/payments";

export const Route = createFileRoute("/api/seevplus/payout")({
  server: {
    handlers: {
      POST: handle(async ({ request }) => {
        const user = await requireUser(request);
        rateLimit(`withdraw:${user.profileId}`, 5, 10 * 60_000);
        return json(await requestWithdrawal(user, await readJson(request)));
      }),
    },
  },
});
