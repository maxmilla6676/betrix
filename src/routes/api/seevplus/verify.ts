import { createFileRoute } from "@tanstack/react-router";
import { handle, json, rateLimit, readJson } from "@/server/http";
import { requireUser } from "@/server/auth";
import { verifyDeposit } from "@/server/payments";

export const Route = createFileRoute("/api/seevplus/verify")({
  server: {
    handlers: {
      POST: handle(async ({ request }) => {
        const user = await requireUser(request);
        rateLimit(`verify:${user.profileId}`, 40, 10 * 60_000);
        return json(await verifyDeposit(user, await readJson(request)));
      }),
    },
  },
});
