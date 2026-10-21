import { createFileRoute } from "@tanstack/react-router";
import { handle, json, rateLimit, readJson } from "@/server/http";
import { requireUser } from "@/server/auth";
import { placeBet } from "@/server/bets";

export const Route = createFileRoute("/api/bets/place")({
  server: {
    handlers: {
      POST: handle(async ({ request }) => {
        const user = await requireUser(request);
        rateLimit(`bet:${user.profileId}`, 30, 60_000);
        return json(await placeBet(user, await readJson(request)));
      }),
    },
  },
});
