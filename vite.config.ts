// Ensure Nitro builds with preset 'vercel' producing .vercel/output for Vercel deployments
process.env["NITRO_PRESET"] = process.env["NITRO_PRESET"] || "vercel";

import type { Plugin } from "vite";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

/**
 * Vite Dev Server Middleware Plugin
 * ---------------------------------
 * Seamlessly routes `/api/*` requests in local development to the TypeScript
 * serverless handlers in `api/` via `server.ssrLoadModule`, matching Vercel's
 * production behavior without requiring Vercel CLI locally.
 */
function devApiPlugin(): Plugin {
  return {
    name: "betrix-dev-api-middleware",
    apply: "serve", // Development only
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith("/api/")) {
          return next();
        }

        try {
          const urlObj = new URL(req.url, `http://${req.headers.host || "localhost"}`);
          const pathname = urlObj.pathname;

          let body: any = {};
          if (req.method === "POST" || req.method === "PUT") {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
            }
            const raw = Buffer.concat(chunks).toString("utf-8");
            try {
              body = JSON.parse(raw);
            } catch {
              body = raw;
            }
          }

          const query: Record<string, string> = {};
          urlObj.searchParams.forEach((val, key) => {
            query[key] = val;
          });

          const vercelRes = {
            statusCode: 200,
            status(code: number) {
              res.statusCode = code;
              return vercelRes;
            },
            json(data: unknown) {
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(data));
            },
            setHeader(name: string, value: string) {
              res.setHeader(name, value);
            },
          };

          const vercelReq = {
            method: req.method,
            body,
            query,
            headers: req.headers as Record<string, string | string[] | undefined>,
          };

          if (pathname === "/api/seevplus/checkout") {
            const mod = await server.ssrLoadModule("/api/seevplus/checkout.ts");
            return await mod.default(vercelReq, vercelRes);
          }
          if (pathname === "/api/seevplus/verify") {
            const mod = await server.ssrLoadModule("/api/seevplus/verify.ts");
            return await mod.default(vercelReq, vercelRes);
          }
          if (pathname === "/api/seevplus/payout") {
            const mod = await server.ssrLoadModule("/api/seevplus/payout.ts");
            return await mod.default(vercelReq, vercelRes);
          }
          if (pathname === "/api/seevplus/webhook") {
            const mod = await server.ssrLoadModule("/api/seevplus/webhook.ts");
            return await mod.default(vercelReq, vercelRes);
          }
          if (pathname === "/api/espn") {
            const mod = await server.ssrLoadModule("/api/espn.ts");
            return await mod.default(vercelReq, vercelRes);
          }

          next();
        } catch (err: unknown) {
          console.error("[dev-api-middleware error]:", err);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [devApiPlugin()],
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
