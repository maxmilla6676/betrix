import { createFileRoute } from "@tanstack/react-router";
import { clientIp, handle, json, rateLimit, readJson } from "@/server/http";
import { applyAsPartner } from "@/server/partners";

export const Route = createFileRoute("/api/partners/apply")({
  server: {
    handlers: {
      POST: handle(async ({ request }) => {
        rateLimit(`partner-apply:${clientIp(request)}`, 5, 15 * 60_000);
        return json(await applyAsPartner(await readJson(request)));
      }),
    },
  },
});
