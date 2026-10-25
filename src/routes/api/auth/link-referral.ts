import { createFileRoute } from "@tanstack/react-router";
import { handle, json, rateLimit, readJson } from "@/server/http";
import { requireUser } from "@/server/auth";
import { linkReferral } from "@/server/accounts";

export const Route = createFileRoute("/api/auth/link-referral")({
  server: {
    handlers: {
      POST: handle(async ({ request }) => {
        const user = await requireUser(request);
        rateLimit(`link-ref:${user.profileId}`, 20, 10 * 60_000);
        return json(await linkReferral(user, await readJson(request)));
      }),
    },
  },
});
