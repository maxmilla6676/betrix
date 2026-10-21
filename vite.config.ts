// Ensure Nitro builds with preset 'vercel' producing .vercel/output for Vercel deployments
process.env["NITRO_PRESET"] = process.env["NITRO_PRESET"] || "vercel";

import { loadEnv } from "vite";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Server routes (src/routes/api/*) read secrets from process.env. Vite only
// exposes VITE_* vars to import.meta.env, so load .env into process.env for
// local dev. On Vercel the real environment variables are already set.
if (process.env["NODE_ENV"] !== "production") {
  const fileEnv = loadEnv("development", process.cwd(), "");
  for (const [key, value] of Object.entries(fileEnv)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
