import { createFileRoute } from "@tanstack/react-router";
import { clientIp, handle, json, rateLimit, readJson } from "@/server/http";
import { registerAccount } from "@/server/accounts";

export const Route = createFileRoute("/api/auth/register")({
  server: {
    handlers: {
      POST: handle(async ({ request }) => {
        rateLimit(`register:${clientIp(request)}`, 5, 15 * 60_000);
        return json(await registerAccount(await readJson(request)));
      }),
    },
  },
});
