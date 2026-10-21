import { createFileRoute } from "@tanstack/react-router";
import { handle, json } from "@/server/http";

/** Same-origin proxy for ESPN's public scoreboards (avoids browser CORS limits). */
export const Route = createFileRoute("/api/espn")({
  server: {
    handlers: {
      GET: handle(async ({ request }) => {
        const params = new URL(request.url).searchParams;
        const target = params.get("url") || "";
        if (!target.startsWith("https://site.api.espn.com/")) {
          return json({ error: "Missing or invalid `url`. Must be an ESPN API URL." }, 400);
        }
        let fetchUrl = target;
        const dates = params.get("dates");
        if (dates && /^\d{8}$/.test(dates)) {
          fetchUrl += (fetchUrl.includes("?") ? "&" : "?") + `dates=${dates}`;
        }
        const upstream = await fetch(fetchUrl, {
          headers: { "User-Agent": "Mozilla/5.0 BetrixProxy/1.0", Accept: "application/json" },
          signal: AbortSignal.timeout(8000),
        }).catch(() => null);
        if (!upstream || !upstream.ok) {
          return json({ error: `ESPN returned ${upstream?.status ?? "no response"}` }, 502);
        }
        return new Response(await upstream.text(), {
          headers: {
            "content-type": "application/json",
            "cache-control": "public, s-maxage=20, stale-while-revalidate=30",
          },
        });
      }),
    },
  },
});
