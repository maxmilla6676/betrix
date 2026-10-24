import crypto from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { HttpError, handle, json, readJson } from "@/server/http";
import { adminDb } from "@/server/db";

function makeBookingCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(6);
  let out = "";
  for (const b of bytes) out += chars[b % chars.length];
  return `BTX-${out}`;
}

export const Route = createFileRoute("/api/bets/book")({
  server: {
    handlers: {
      /**
       * POST: Save a booking code with selections (used by admin deriving codes
       * for fixed matches, or players booking slips).
       */
      POST: handle(async ({ request }) => {
        const body = (await readJson(request)) as Record<string, unknown>;
        const rawCode = typeof body["code"] === "string" ? body["code"].trim().toUpperCase() : "";
        const code = rawCode && /^BTX-[A-Z0-9]{4,12}$/.test(rawCode) ? rawCode : makeBookingCode();

        const selections = Array.isArray(body["selections"]) ? body["selections"] : [];
        if (selections.length === 0) {
          throw new HttpError(400, "Selections list cannot be empty.");
        }

        const matchTitle =
          typeof body["matchTitle"] === "string" && body["matchTitle"]
            ? body["matchTitle"]
            : selections.length === 1
              ? (selections[0].matchTitle || "Single Match")
              : `${selections.length} Selections Accumulator`;

        const totalOdds =
          typeof body["totalOdds"] === "number" && body["totalOdds"] > 0
            ? body["totalOdds"]
            : Number(
                selections
                  .reduce((acc: number, s: any) => acc * (Number(s.multiplier) || 1), 1)
                  .toFixed(2),
              );

        const db = adminDb();

        // 1. Try saving into public.booking_codes table
        try {
          await db.from("booking_codes").upsert({
            code,
            selections,
            match_title: matchTitle,
            total_odds: totalOdds,
            created_at: new Date().toISOString(),
          });
        } catch {
          // Ignore if booking_codes table is not present
        }

        // 2. Also save into slips table with SYSTEM_BOOKING user_phone
        // This ensures supabase.rpc('slip_by_code') finds it instantly across all clients
        try {
          await db.from("slips").upsert({
            code,
            user_phone: "SYSTEM_BOOKING",
            stake: 1,
            pot_win: Math.round(totalOdds * 100) / 100,
            payout: 0,
            status: "VOID",
            match_title: matchTitle,
            selections,
            created_at: new Date().toISOString(),
          });
        } catch (slipErr: any) {
          console.warn("[booking] Could not insert into slips table:", slipErr?.message);
        }

        return json({
          success: true,
          code,
          matchTitle,
          totalOdds,
          selectionsCount: selections.length,
          selections,
        });
      }),

      /**
       * GET: Retrieve a booking code or slip by code (fallback/direct lookup).
       */
      GET: handle(async ({ request }) => {
        const url = new URL(request.url);
        const code = (url.searchParams.get("code") || "").trim().toUpperCase();
        if (!code) throw new HttpError(400, "Missing code parameter.");

        const db = adminDb();

        // Try booking_codes table first
        const { data: bRow } = await db
          .from("booking_codes")
          .select("*")
          .eq("code", code)
          .maybeSingle();

        if (bRow) {
          return json({
            code: bRow.code,
            selections: bRow.selections,
            matchTitle: bRow.match_title,
            totalOdds: Number(bRow.total_odds || 1),
            status: "BOOKED",
            createdAt: bRow.created_at,
          });
        }

        // Fallback to slips table
        const { data: sRow } = await db
          .from("slips")
          .select("code, selections, match_title, status, created_at")
          .eq("code", code)
          .maybeSingle();

        if (sRow) {
          return json({
            code: sRow.code,
            selections: sRow.selections,
            matchTitle: sRow.match_title,
            status: sRow.status,
            createdAt: sRow.created_at,
          });
        }

        throw new HttpError(404, `Booking code ${code} not found.`);
      }),
    },
  },
});
