/**
 * Server-side match resolution: re-derives a match's real status, score and
 * odds from ESPN or the admin_matches table, so nothing the browser sends about
 * a match (kickoff, status, odds) is trusted.
 */
import type { Match } from "@/data/football";
import {
  FREE_SPORTS_SOURCES,
  parseEspnEvent,
  scoreboardUrl,
  sourceById,
  type SportsApiSource,
} from "@/lib/espn";
import {
  adminLeagueFromRow,
  adminMatchFromRow,
  buildAdminMatch,
  computeAdminMatchLiveState,
} from "@/data/adminMatches";
import { adminDb } from "./db";

export interface ResolvedMatch {
  match: Match;
  title: string;
}

export interface MatchHint {
  sourceId?: string | undefined;
  espnDate?: string | undefined;
  kickoff?: string | undefined;
}

const SCOREBOARD_TTL_MS = 20_000;
const scoreboardCache = new Map<string, { at: number; events: any[] }>();

async function fetchScoreboard(source: SportsApiSource, espnDate?: string): Promise<any[]> {
  const url = scoreboardUrl(source, espnDate);
  const cached = scoreboardCache.get(url);
  if (cached && Date.now() - cached.at < SCOREBOARD_TTL_MS) return cached.events;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 BetrixServer/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data: any = await res.json();
    const events = Array.isArray(data?.events) ? data.events : [];
    scoreboardCache.set(url, { at: Date.now(), events });
    return events;
  } catch {
    return [];
  }
}

const ymd = (d: Date) =>
  `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;

function candidateDates(hint: MatchHint): (string | undefined)[] {
  const out: (string | undefined)[] = [];
  if (hint.espnDate && /^\d{8}$/.test(hint.espnDate)) out.push(hint.espnDate);
  const k = hint.kickoff ? new Date(hint.kickoff) : null;
  if (k && !isNaN(k.getTime())) {
    for (const offset of [0, -1, 1]) out.push(ymd(new Date(k.getTime() + offset * 86400000)));
  }
  out.push(undefined); // ESPN's default "today" board
  return [...new Set(out)];
}

async function resolveEspnMatch(matchId: string, hint: MatchHint): Promise<ResolvedMatch | null> {
  const eventId = matchId.slice("api-".length);
  if (!/^\d+$/.test(eventId)) return null;
  const known = hint.sourceId ? sourceById(hint.sourceId) : undefined;
  // Legacy slips have no source id: fall back to scanning every feed.
  const sources = known ? [known] : FREE_SPORTS_SOURCES;

  for (const date of candidateDates(hint)) {
    for (const source of sources) {
      const events = await fetchScoreboard(source, date);
      const ev = events.find((e) => String(e?.id) === eventId);
      if (!ev) continue;
      const parsed = parseEspnEvent(ev, source, date);
      if (!parsed) return null;
      return { match: parsed.match, title: `${parsed.homeTeam.name} vs ${parsed.awayTeam.name}` };
    }
  }
  return null;
}

async function resolveAdminMatch(matchId: string): Promise<ResolvedMatch | null> {
  const db = adminDb();
  const { data: row } = await db.from("admin_matches").select("*").eq("id", matchId).maybeSingle();
  if (!row) return null;
  const am = adminMatchFromRow(row);
  const { data: lgRows } = await db.from("admin_leagues").select("*").eq("id", am.leagueId);
  const now = Date.now();
  const liveState = computeAdminMatchLiveState(am, now);

  if (liveState.isCompleted && liveState.status === "FINISHED" && row.status !== "finished") {
    try {
      await db
        .from("admin_matches")
        .update({
          status: "finished",
          home_score: liveState.homeScore,
          away_score: liveState.awayScore,
        })
        .eq("id", matchId);
    } catch {
      // Best-effort auto-finish
    }
  }

  const { match } = buildAdminMatch(am, (lgRows || []).map(adminLeagueFromRow), now);
  return { match, title: `${am.homeTeam} vs ${am.awayTeam}` };
}

export async function resolveMatch(
  matchId: string,
  hint: MatchHint = {},
): Promise<ResolvedMatch | null> {
  if (typeof matchId !== "string" || matchId.length > 80) return null;
  if (matchId.startsWith("api-")) return resolveEspnMatch(matchId, hint);
  if (matchId.startsWith("adm-")) return resolveAdminMatch(matchId);
  return null;
}
