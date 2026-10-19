/**
 * Vercel Serverless ESPN Proxy  (api/espn.ts)
 * ----------------------------
 * Forwards GET requests to the ESPN public scoreboard API and returns the JSON.
 * Runs server-side so there are NO CORS issues (server-to-server fetch).
 *
 * Usage from the browser:
 *   /api/espn?url=https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard&dates=20241019
 */

// Inline Vercel request/response types — avoids needing @vercel/node as a dep
interface VercelRequest {
  method?: string;
  query: Record<string, string | string[] | undefined>;
}
interface VercelResponse {
  status(code: number): VercelResponse;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const targetUrl = req.query?.url as string | undefined;

  if (!targetUrl || !targetUrl.startsWith("https://site.api.espn.com/")) {
    res
      .status(400)
      .json({ error: "Missing or invalid `url` query parameter. Must be an ESPN API URL." });
    return;
  }

  // Append dates param forwarded from the client
  let fetchUrl = targetUrl;
  const dates = req.query?.dates as string | undefined;
  if (dates) {
    fetchUrl += (fetchUrl.includes("?") ? "&" : "?") + `dates=${encodeURIComponent(dates)}`;
  }

  try {
    const upstream = await fetch(fetchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 BetrixProxy/1.0",
        Accept: "application/json",
      },
    });

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: `ESPN returned ${upstream.status}` });
      return;
    }

    const data = await upstream.json();

    // Cache at the Vercel CDN edge for 20 s — aligns with our 25 s poll interval
    res.setHeader("Cache-Control", "s-maxage=20, stale-while-revalidate=30");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("ESPN proxy error:", msg);
    res.status(502).json({ error: "Failed to fetch from ESPN", detail: msg });
  }
}
