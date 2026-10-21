import { createFileRoute } from "@tanstack/react-router";
import { handle, json, rateLimit, readJson } from "@/server/http";
import { requireUser } from "@/server/auth";
import { startDeposit } from "@/server/payments";

export const Route = createFileRoute("/api/seevplus/checkout")({
  server: {
    handlers: {
      POST: handle(async ({ request }) => {
        const user = await requireUser(request);
        rateLimit(`deposit:${user.profileId}`, 10, 10 * 60_000);
        const origin = new URL(request.url).origin;
        return json(await startDeposit(user, await readJson(request), origin));
      }),
    },
  },
});
