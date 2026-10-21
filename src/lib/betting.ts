import type { Match } from "@/data/football";

/** Minimal selection shape needed to grade a bet. */
export interface GradableSelection {
  matchId: string;
  marketId: string;
  optionId: string;
  multiplier: number;
}

export type SelectionResult = "WON" | "LOST" | "VOID";

/** Betting limits enforced by the server (shown in the UI too). */
export const BET_LIMITS = {
  minStake: 1,
  maxStake: 5000,
  maxSelections: 20,
  maxPotWin: 100000,
} as const;

/**
 * Normalise an option id. Older admin matches used ids like `<matchId>_1`,
 * `<matchId>_btts_yes`; map those onto the canonical ids used everywhere else.
 */
export function canonicalOptionId(matchId: string, optionId: string): string {
  let id = (optionId || "").trim();
  if (id.startsWith(`${matchId}_`)) id = id.slice(matchId.length + 1);
  const legacy: Record<string, string> = {
    "1": "home",
    x: "draw",
    "2": "away",
    btts_yes: "yes",
    btts_no: "no",
    h1: "h-1",
    a1: "a+1",
  };
  return legacy[id] ?? id;
}

/** Grade one selection against a finished match's final score. */
export function gradeSelection(sel: GradableSelection, m: Match): SelectionResult {
  if (m.homeScore === undefined || m.awayScore === undefined) return "VOID";
  const h = m.homeScore;
  const a = m.awayScore;
  const opt = canonicalOptionId(sel.matchId, sel.optionId);

  switch (sel.marketId) {
    case "1x2":
      if (opt === "home") return h > a ? "WON" : "LOST";
      if (opt === "draw") return h === a ? "WON" : "LOST";
      if (opt === "away") return a > h ? "WON" : "LOST";
      break;
    case "dc":
      if (opt === "1x") return h >= a ? "WON" : "LOST";
      if (opt === "x2") return a >= h ? "WON" : "LOST";
      if (opt === "12") return h !== a ? "WON" : "LOST";
      break;
    case "ou":
      if (opt === "o25") return h + a > 2.5 ? "WON" : "LOST";
      if (opt === "u25") return h + a < 2.5 ? "WON" : "LOST";
      break;
    case "totals":
      if (opt === "o15") return h + a > 1.5 ? "WON" : "LOST";
      if (opt === "u35") return h + a < 3.5 ? "WON" : "LOST";
      break;
    case "btts":
      if (opt === "yes") return h > 0 && a > 0 ? "WON" : "LOST";
      if (opt === "no") return h === 0 || a === 0 ? "WON" : "LOST";
      break;
    case "hcp": {
      // Two-way -1 / +1 handicap: a one-goal home win is a push (stake returned).
      const margin = h - a;
      if (margin === 1) return "VOID";
      if (opt === "h-1") return margin >= 2 ? "WON" : "LOST";
      if (opt === "a+1") return margin <= 0 ? "WON" : "LOST";
      break;
    }
    case "cs": {
      const score = opt.replace(/^cs-/, "");
      return score === `${h}:${a}` ? "WON" : "LOST";
    }
  }
  // Unknown market/option (e.g. HT/FT, which needs half-time data we don't have): refund.
  return "VOID";
}

/**
 * Grade a whole accumulator. Any lost leg loses the slip; void legs count as
 * odds 1.00; if every leg is void the stake is refunded.
 */
export function gradeSlip(
  selections: GradableSelection[],
  results: SelectionResult[],
  stake: number,
): { status: "WON" | "LOST" | "VOID"; payout: number } {
  if (results.some((r) => r === "LOST")) return { status: "LOST", payout: 0 };
  if (results.every((r) => r === "VOID")) return { status: "VOID", payout: stake };
  const odds = selections.reduce(
    (acc, s, i) => (results[i] === "WON" ? acc * s.multiplier : acc),
    1,
  );
  return { status: "WON", payout: Number((stake * odds).toFixed(2)) };
}

/** Kept for UI callers that only need a yes/no on a single selection. */
export function evaluateSelection(sel: GradableSelection, m: Match): boolean {
  return gradeSelection(sel, m) === "WON";
}
