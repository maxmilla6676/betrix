import crypto from "node:crypto";
import { isMatchLocked } from "@/data/football";
import { BET_LIMITS, gradeSelection, gradeSlip, type SelectionResult } from "@/lib/betting";
import type { AuthedUser } from "./auth";
import { adminDb } from "./db";
import { HttpError, dbError } from "./http";
import { resolveMatch } from "./matches";

/** Selection as stored in `slips.selections` — every field below is server-derived. */
export interface StoredSelection {
  matchId: string;
  marketId: string;
  marketName: string;
  optionId: string;
  optionLabel: string;
  multiplier: number;
  matchTitle: string;
  kickoffTime: string;
  sourceId?: string | undefined;
  espnDate?: string | undefined;
}

const str = (v: unknown, max = 80) =>
  typeof v === "string" && v.length > 0 && v.length <= max ? v : undefined;

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(6);
  let out = "";
  for (const b of bytes) out += chars[b % chars.length];
  return out;
}

export async function placeBet(user: AuthedUser, body: Record<string, unknown>) {
  const stake = Math.round(Number(body["stake"]) * 100) / 100;
  if (!Number.isFinite(stake) || stake < BET_LIMITS.minStake || stake > BET_LIMITS.maxStake) {
    throw new HttpError(
      400,
      `Stake must be between GHS ${BET_LIMITS.minStake} and GHS ${BET_LIMITS.maxStake}.`,
    );
  }

  const raw = Array.isArray(body["selections"])
    ? (body["selections"] as Record<string, unknown>[])
    : [];
  if (raw.length === 0) throw new HttpError(400, "Your bet slip is empty.");
  if (raw.length > BET_LIMITS.maxSelections) {
    throw new HttpError(400, `A slip can have at most ${BET_LIMITS.maxSelections} selections.`);
  }

  const seenMatches = new Set<string>();
  const selections: StoredSelection[] = [];
  let oddsChanged = false;

  for (const s of raw) {
    const matchId = str(s["matchId"]);
    const marketId = str(s["marketId"], 40);
    const optionId = str(s["optionId"], 40);
    if (!matchId || !marketId || !optionId) throw new HttpError(400, "Invalid selection in slip.");
    // Correlated legs from the same match (e.g. "Home" + "1X") can't be multiplied together.
    if (seenMatches.has(matchId))
      throw new HttpError(400, "Only one selection per match is allowed.");
    seenMatches.add(matchId);

    const resolved = await resolveMatch(matchId, {
      sourceId: str(s["sourceId"], 30),
      espnDate: str(s["espnDate"], 8),
      kickoff: str(s["kickoffTime"], 40),
    });
    if (!resolved)
      throw new HttpError(400, "One of your matches is no longer available. Please remove it.");
    const { match, title } = resolved;
    if (isMatchLocked(match)) {
      throw new HttpError(
        400,
        `${title} has already started — odds are locked. Remove it to continue.`,
        { matchId },
      );
    }

    const market = match.markets.find((m) => m.id === marketId);
    const option = market?.options.find((o) => o.id === optionId);
    if (!market || !option || market.status !== "ACTIVE") {
      throw new HttpError(400, `That market is not available for ${title}.`, { matchId });
    }

    const clientMultiplier = Number(s["multiplier"]);
    if (
      !Number.isFinite(clientMultiplier) ||
      Math.abs(clientMultiplier - option.multiplier) > 0.001
    ) {
      oddsChanged = true;
    }

    selections.push({
      matchId,
      marketId,
      marketName: market.name,
      optionId,
      optionLabel: option.label,
      multiplier: option.multiplier,
      matchTitle: title,
      kickoffTime: match.kickoff,
      sourceId: match.sourceId,
      espnDate: match.espnDate,
    });
  }

  if (oddsChanged) {
    throw new HttpError(409, "Odds have changed. Please review your slip and confirm again.", {
      selections,
    });
  }

  const totalOdds = selections.reduce((acc, s) => acc * s.multiplier, 1);
  const potWin = Math.round(stake * totalOdds * 100) / 100;
  if (potWin > BET_LIMITS.maxPotWin) {
    throw new HttpError(
      400,
      `Maximum potential win is GHS ${BET_LIMITS.maxPotWin.toLocaleString()}. Lower your stake.`,
    );
  }
  const matchTitle =
    selections.length === 1
      ? selections[0]!.matchTitle
      : `${selections.length} Selections Accumulator`;

  const db = adminDb();
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = makeCode();
    const { data, error } = await db.rpc("place_bet", {
      p_profile_id: user.profileId,
      p_code: code,
      p_stake: stake,
      p_pot_win: potWin,
      p_selections: selections,
      p_match_title: matchTitle,
    });
    if (!error) {
      const initialCashout = Math.round(stake * 0.90 * 100) / 100;
      return {
        balance: Number((data as any)?.balance ?? 0),
        entry: {
          code,
          createdAt: new Date().toISOString(),
          stake,
          selections,
          status: "PENDING" as const,
          payout: 0,
          potWin,
          matchTitle,
          cashoutAvailable: true,
          cashoutValue: initialCashout,
        },
      };
    }
    if (!/duplicate key/i.test(error.message)) throw dbError(error);
  }
  throw new HttpError(500, "Could not generate a booking code. Please try again.");
}

const POSTPONED_VOID_AFTER_MS = 48 * 3600_000;
const UNRESOLVED_VOID_AFTER_MS = 7 * 86400_000;

async function gradeLeg(sel: StoredSelection): Promise<SelectionResult | "OPEN"> {
  const resolved = await resolveMatch(sel.matchId, {
    sourceId: sel.sourceId,
    espnDate: sel.espnDate,
    kickoff: sel.kickoffTime,
  });
  const kickoffMs = new Date(sel.kickoffTime || 0).getTime();
  const age = Date.now() - (isNaN(kickoffMs) ? 0 : kickoffMs);

  if (!resolved) return age > UNRESOLVED_VOID_AFTER_MS ? "VOID" : "OPEN";
  const m = resolved.match;
  if (m.status === "FINISHED") return gradeSelection(sel, m);
  if (m.status === "CANCELLED") return "VOID";
  if (m.status === "POSTPONED" && age > POSTPONED_VOID_AFTER_MS) return "VOID";
  return "OPEN";
}

/**
 * Settle pending slips whose matches have all finished. Idempotent: the
 * database refuses to settle a slip twice.
 */
export async function settlePending(opts: { phone?: string; limit?: number; deadlineMs?: number }) {
  const db = adminDb();
  let q = db
    .from("slips")
    .select("code, stake, selections, user_phone")
    .eq("status", "PENDING")
    .order("created_at", { ascending: true })
    .limit(opts.limit ?? 25);
  if (opts.phone) q = q.eq("user_phone", opts.phone);
  const { data: slips, error } = await q;
  if (error) throw dbError(error);

  const deadline = Date.now() + (opts.deadlineMs ?? 8000);
  const settled: { code: string; status: string; payout: number }[] = [];

  for (const slip of slips || []) {
    if (Date.now() > deadline) break;
    const sels = (Array.isArray(slip.selections) ? slip.selections : []) as StoredSelection[];
    if (sels.length === 0) continue;

    const results: SelectionResult[] = [];
    let open = false;
    for (const sel of sels) {
      const r = await gradeLeg(sel);
      if (r === "OPEN") {
        open = true;
        break;
      }
      results.push(r);
      if (r === "LOST") break; // one lost leg decides the slip
    }
    if (open && !results.includes("LOST")) continue;

    const graded = results.includes("LOST")
      ? { status: "LOST" as const, payout: 0 }
      : gradeSlip(sels, results, Number(slip.stake));

    const { error: rpcErr } = await db.rpc("settle_slip", {
      p_code: slip.code,
      p_status: graded.status,
      p_payout: graded.payout,
    });
    if (rpcErr) {
      console.error("[settle]", slip.code, rpcErr.message);
      continue;
    }
    settled.push({ code: slip.code, status: graded.status, payout: graded.payout });
  }

  return { settled, checked: slips?.length ?? 0 };
}
