import type { Match, MatchStatus, Market, Team, League } from "@/data/football";
import { stringHash } from "@/lib/espn";
import { dynamicTeams, dynamicLeagues, dynamicMatchesMap } from "@/services/sportsApi";

export type AdminMatchOutcome = "home" | "draw" | "away";

export interface AdminLeague {
  id: string;
  name: string;
  country: string;
  color: string;
  logoUrl?: string | undefined;
  defaultOutcome?: AdminMatchOutcome | undefined;
  defaultOutcomeScore?: string | undefined;
  defaultHomeScore?: number | undefined;
  defaultAwayScore?: number | undefined;
  createdAt: string;
}

export interface AdminMatch {
  id: string;
  leagueId: string;
  homeTeam: string;
  awayTeam: string;
  homeLogoUrl?: string | undefined;
  awayLogoUrl?: string | undefined;
  kickoffDate: string; // "YYYY-MM-DD" (Ghana time = UTC)
  kickoffTime: string; // "HH:mm"
  status: "scheduled" | "live" | "finished" | "cancelled";
  /** Target final outcome (e.g. "home", "draw", "away") */
  outcome?: AdminMatchOutcome | undefined;
  /** Encoded target score and duration (e.g. "2-1" or "2-1:90") */
  outcomeScore?: string | undefined;
  targetOutcome?: AdminMatchOutcome | undefined;
  targetHomeScore?: number | undefined;
  targetAwayScore?: number | undefined;
  durationMinutes?: number | undefined;
  minute?: number | undefined;
  /** Real score entered by an admin or reached at FT. */
  homeScore?: number | undefined;
  awayScore?: number | undefined;
  createdAt: string;
}

/**
 * Parses target outcome, target scores, and duration from an AdminMatch.
 */
export function parseAdminMatchOutcome(am: {
  outcome?: string | undefined;
  outcomeScore?: string | undefined;
  targetOutcome?: AdminMatchOutcome | undefined;
  targetHomeScore?: number | undefined;
  targetAwayScore?: number | undefined;
  durationMinutes?: number | undefined;
}): {
  targetHome: number;
  targetAway: number;
  outcome: AdminMatchOutcome;
  durationMinutes: number;
} {
  let targetHome = typeof am.targetHomeScore === "number" ? am.targetHomeScore : undefined;
  let targetAway = typeof am.targetAwayScore === "number" ? am.targetAwayScore : undefined;
  let duration =
    typeof am.durationMinutes === "number" && am.durationMinutes > 0
      ? am.durationMinutes
      : 90;

  if (
    (targetHome === undefined || targetAway === undefined) &&
    typeof am.outcomeScore === "string"
  ) {
    const [scorePart, durPart] = am.outcomeScore.split(":");
    if (durPart && !isNaN(Number(durPart)) && Number(durPart) > 0) {
      duration = Number(durPart);
    }
    const [hStr, aStr] = (scorePart || "").split("-");
    const h = parseInt(hStr || "", 10);
    const a = parseInt(aStr || "", 10);
    if (!isNaN(h) && !isNaN(a)) {
      targetHome = h;
      targetAway = a;
    }
  }

  // Fallback defaults
  if (targetHome === undefined || targetAway === undefined) {
    targetHome = 1;
    targetAway = 0;
  }

  const rawOutcome = am.targetOutcome || am.outcome;
  const outcome: AdminMatchOutcome =
    rawOutcome === "home" || rawOutcome === "draw" || rawOutcome === "away"
      ? rawOutcome
      : targetHome > targetAway
        ? "home"
        : targetHome < targetAway
          ? "away"
          : "draw";

  return { targetHome, targetAway, outcome, durationMinutes: duration };
}

/**
 * Deterministically distributes target goals across the 90 virtual match minutes.
 */
export function getGoalSchedule(
  matchId: string,
  targetHome: number,
  targetAway: number,
): { minute: number; team: "home" | "away" }[] {
  const total = targetHome + targetAway;
  if (total <= 0) return [];

  const seed = stringHash(matchId);
  const teamPool: ("home" | "away")[] = [
    ...Array(targetHome).fill("home"),
    ...Array(targetAway).fill("away"),
  ];

  // Deterministic Fisher-Yates shuffle
  for (let i = teamPool.length - 1; i > 0; i--) {
    const j = Math.abs((seed * (i + 1) * 31) % (i + 1));
    const tmp = teamPool[i];
    teamPool[i] = teamPool[j];
    teamPool[j] = tmp;
  }

  const step = 84 / (total + 1);
  const minutes: number[] = [];

  for (let i = 0; i < total; i++) {
    const baseMin = Math.round(step * (i + 1));
    const jitter = ((seed * (i + 7) * 17) % 9) - 4; // -4 to +4
    const min = Math.max(5, Math.min(88, baseMin + jitter));
    minutes.push(min);
  }

  minutes.sort((a, b) => a - b);
  for (let i = 1; i < minutes.length; i++) {
    if (minutes[i] <= minutes[i - 1]) {
      minutes[i] = Math.min(89, minutes[i - 1] + 2);
    }
  }

  return minutes.map((minute, i) => ({
    minute,
    team: teamPool[i],
  }));
}

export interface AdminMatchLiveState {
  status: MatchStatus;
  minute?: number | undefined;
  homeScore?: number | undefined;
  awayScore?: number | undefined;
  isCompleted: boolean;
  targetHome: number;
  targetAway: number;
  targetOutcome: AdminMatchOutcome;
  durationMinutes: number;
}

/**
 * Calculates current real-time or simulated state of an AdminMatch.
 * Advances through live minutes and guarantees final score equals the target outcome.
 */
export function computeAdminMatchLiveState(
  am: AdminMatch,
  now = Date.now(),
): AdminMatchLiveState {
  const { targetHome, targetAway, outcome, durationMinutes } = parseAdminMatchOutcome(am);

  if (am.status === "cancelled") {
    return {
      status: "CANCELLED",
      minute: undefined,
      homeScore: undefined,
      awayScore: undefined,
      isCompleted: true,
      targetHome,
      targetAway,
      targetOutcome: outcome,
      durationMinutes,
    };
  }

  if (am.status === "finished") {
    return {
      status: "FINISHED",
      minute: 90,
      homeScore: typeof am.homeScore === "number" ? am.homeScore : targetHome,
      awayScore: typeof am.awayScore === "number" ? am.awayScore : targetAway,
      isCompleted: true,
      targetHome,
      targetAway,
      targetOutcome: outcome,
      durationMinutes,
    };
  }

  const kickoffMs = new Date(adminKickoffIso(am)).getTime();
  const validKickoff = isNaN(kickoffMs) ? now : kickoffMs;
  const durationMs = durationMinutes * 60 * 1000;
  const endMs = validKickoff + durationMs;

  const isStarted = now >= validKickoff || am.status === "live";

  if (!isStarted) {
    return {
      status: "SCHEDULED",
      minute: undefined,
      homeScore: undefined,
      awayScore: undefined,
      isCompleted: false,
      targetHome,
      targetAway,
      targetOutcome: outcome,
      durationMinutes,
    };
  }

  // End of match duration reached — finish exactly with target outcome!
  if (now >= endMs) {
    return {
      status: "FINISHED",
      minute: 90,
      homeScore: typeof am.homeScore === "number" ? am.homeScore : targetHome,
      awayScore: typeof am.awayScore === "number" ? am.awayScore : targetAway,
      isCompleted: true,
      targetHome,
      targetAway,
      targetOutcome: outcome,
      durationMinutes,
    };
  }

  // Currently live: calculate minute 1' to 90' and progressive score
  const effectiveKickoff = now < validKickoff ? now - 1000 : validKickoff;
  const elapsed = Math.max(0, now - effectiveKickoff);
  const ratio = Math.min(1, elapsed / durationMs);
  const simMinute = Math.min(90, Math.max(1, Math.floor(ratio * 90) + 1));

  const goals = getGoalSchedule(am.id, targetHome, targetAway);
  let liveHome = 0;
  let liveAway = 0;
  for (const g of goals) {
    if (g.minute <= simMinute) {
      if (g.team === "home") liveHome++;
      else liveAway++;
    }
  }

  return {
    status: "LIVE",
    minute: simMinute,
    homeScore: liveHome,
    awayScore: liveAway,
    isCompleted: false,
    targetHome,
    targetAway,
    targetOutcome: outcome,
    durationMinutes,
  };
}

/**
 * Odds for admin-created fixtures. Seeded only by the team names so they are
 * stable and identical on the server and in the browser; they never depend on
 * the result.
 */
function generateAdminMatchMarkets(am: AdminMatch): Market[] {
  const hash = stringHash(`${am.homeTeam}-${am.awayTeam}`);
  const j = (base: number, modifier: number) =>
    Math.max(1.1, Math.round((base + ((hash % 13) - 6) * 0.05 + modifier * 0.04) * 100) / 100);

  const scores: [string, number][] = [
    ["1:0", 6.5],
    ["2:0", 8.5],
    ["2:1", 9.0],
    ["3:0", 14.0],
    ["3:1", 18.0],
    ["3:2", 34.0],
    ["0:0", 7.2],
    ["1:1", 6.4],
    ["2:2", 16.5],
    ["0:1", 7.8],
    ["0:2", 10.5],
    ["1:2", 11.2],
    ["0:3", 22.0],
    ["1:3", 25.0],
  ];

  return [
    {
      id: "1x2",
      name: "Match Result",
      status: "ACTIVE",
      options: [
        { id: "home", label: "1", multiplier: j(2.15, 1) },
        { id: "draw", label: "X", multiplier: j(3.35, 2) },
        { id: "away", label: "2", multiplier: j(2.85, 3) },
      ],
    },
    {
      id: "ou",
      name: "Over / Under 2.5",
      status: "ACTIVE",
      options: [
        { id: "o25", label: "Over 2.5", multiplier: j(1.82, 1) },
        { id: "u25", label: "Under 2.5", multiplier: j(1.98, 2) },
      ],
    },
    {
      id: "btts",
      name: "Both Teams To Score",
      status: "ACTIVE",
      options: [
        { id: "yes", label: "Yes", multiplier: j(1.7, 1) },
        { id: "no", label: "No", multiplier: j(2.1, 2) },
      ],
    },
    {
      id: "dc",
      name: "Double Chance",
      status: "ACTIVE",
      options: [
        { id: "1x", label: "1X", multiplier: j(1.3, 0.5) },
        { id: "12", label: "12", multiplier: j(1.25, 0.4) },
        { id: "x2", label: "X2", multiplier: j(1.48, 0.6) },
      ],
    },
    {
      id: "hcp",
      name: "Handicap",
      status: "ACTIVE",
      options: [
        { id: "h-1", label: "Home -1", multiplier: j(3.2, 2) },
        { id: "a+1", label: "Away +1", multiplier: j(1.4, 1) },
      ],
    },
    {
      id: "cs",
      name: "Correct Score",
      status: "ACTIVE",
      options: scores.map(([score, base]) => ({
        id: `cs-${score}`,
        label: score,
        multiplier: base,
      })),
    },
  ];
}

export function adminKickoffIso(am: Pick<AdminMatch, "kickoffDate" | "kickoffTime">): string {
  const validDate = am.kickoffDate || new Date().toISOString().slice(0, 10);
  const validTime = am.kickoffTime || "15:00";
  return `${validDate}T${validTime}:00.000Z`;
}

export interface ConvertedAdminMatch {
  match: Match;
  league?: League | undefined;
  homeTeam: Team;
  awayTeam: Team;
}

/** Pure conversion of an admin fixture into a Match (no global side effects). */
export function buildAdminMatch(
  am: AdminMatch,
  leaguesList: AdminLeague[],
  now = Date.now(),
): ConvertedAdminMatch {
  const homeId = `adm-team-h-${am.id}`;
  const awayId = `adm-team-a-${am.id}`;
  const lg = leaguesList.find((l) => l.id === am.leagueId);

  const league: League | undefined = lg
    ? {
        id: lg.id,
        slug: lg.id,
        name: lg.name,
        country: lg.country || "International",
        short: (lg.name.slice(0, 3) || "LGE").toUpperCase(),
        color: lg.color || "#E41B23",
        sportId: "football",
        active: true,
        logo: lg.logoUrl || undefined,
      }
    : undefined;

  const homeTeam: Team = {
    id: homeId,
    name: am.homeTeam,
    short: (am.homeTeam.slice(0, 3) || "HOM").toUpperCase(),
    country: lg?.country || "International",
    leagueId: am.leagueId,
    color: lg?.color || "#E41B23",
    form: [],
    logo: am.homeLogoUrl || undefined,
  };
  const awayTeam: Team = {
    id: awayId,
    name: am.awayTeam,
    short: (am.awayTeam.slice(0, 3) || "AWY").toUpperCase(),
    country: lg?.country || "International",
    leagueId: am.leagueId,
    color: "#3B82F6",
    form: [],
    logo: am.awayLogoUrl || undefined,
  };

  const liveState = computeAdminMatchLiveState(am, now);

  const match: Match = {
    id: am.id,
    code: `#${50000 + (stringHash(am.id) % 49000)}`,
    leagueId: am.leagueId,
    sportId: "football",
    homeId,
    awayId,
    kickoff: adminKickoffIso(am),
    status: liveState.status,
    minute: liveState.minute,
    homeScore: liveState.homeScore,
    awayScore: liveState.awayScore,
    venue: `${am.homeTeam} Arena`,
    hot: true,
    markets: generateAdminMatchMarkets(am),
  };

  return { match, league, homeTeam, awayTeam };
}

/** Browser helper: converts and registers teams/league so UI lookups resolve. */
export function convertAdminMatchToMatch(
  am: AdminMatch,
  leaguesList: AdminLeague[],
  now = Date.now(),
): Match {
  const { match, league, homeTeam, awayTeam } = buildAdminMatch(am, leaguesList, now);
  if (league) dynamicLeagues.set(league.id, league);
  dynamicTeams.set(homeTeam.id, homeTeam);
  dynamicTeams.set(awayTeam.id, awayTeam);
  dynamicMatchesMap.set(match.id, match);
  return match;
}

/** Row mapping shared by browser and server. */
export function adminMatchFromRow(m: any): AdminMatch {
  let targetHomeScore = typeof m.target_home_score === "number" ? m.target_home_score : undefined;
  let targetAwayScore = typeof m.target_away_score === "number" ? m.target_away_score : undefined;
  let durationMinutes = typeof m.duration_minutes === "number" ? m.duration_minutes : undefined;

  const outcomeScore = typeof m.outcome_score === "string" ? m.outcome_score : undefined;
  if ((targetHomeScore === undefined || targetAwayScore === undefined) && outcomeScore) {
    const [scorePart, durPart] = outcomeScore.split(":");
    if (durPart && !isNaN(Number(durPart))) {
      durationMinutes = Number(durPart);
    }
    const [hStr, aStr] = (scorePart || "").split("-");
    const h = parseInt(hStr || "", 10);
    const a = parseInt(aStr || "", 10);
    if (!isNaN(h) && !isNaN(a)) {
      targetHomeScore = h;
      targetAwayScore = a;
    }
  }

  const rawOutcome =
    m.outcome ||
    (targetHomeScore !== undefined && targetAwayScore !== undefined
      ? targetHomeScore > targetAwayScore
        ? "home"
        : targetHomeScore < targetAwayScore
          ? "away"
          : "draw"
      : undefined);

  return {
    id: m.id,
    leagueId: m.league_id,
    homeTeam: m.home_team,
    awayTeam: m.away_team,
    homeLogoUrl: m.home_logo_url || undefined,
    awayLogoUrl: m.away_logo_url || undefined,
    kickoffDate: m.kickoff_date,
    kickoffTime: m.kickoff_time,
    status: (["scheduled", "live", "finished", "cancelled"].includes(m.status)
      ? m.status
      : "scheduled") as AdminMatch["status"],
    outcome: (["home", "draw", "away"].includes(rawOutcome)
      ? rawOutcome
      : undefined) as AdminMatchOutcome | undefined,
    outcomeScore,
    targetOutcome: (["home", "draw", "away"].includes(rawOutcome)
      ? rawOutcome
      : undefined) as AdminMatchOutcome | undefined,
    targetHomeScore,
    targetAwayScore,
    durationMinutes: durationMinutes || 90,
    homeScore: typeof m.home_score === "number" ? m.home_score : undefined,
    awayScore: typeof m.away_score === "number" ? m.away_score : undefined,
    createdAt: m.created_at,
  };
}

export function adminLeagueFromRow(l: any): AdminLeague {
  let defaultHomeScore: number | undefined;
  let defaultAwayScore: number | undefined;
  if (typeof l.default_outcome_score === "string") {
    const [hStr, aStr] = l.default_outcome_score.split("-");
    const h = parseInt(hStr || "", 10);
    const a = parseInt(aStr || "", 10);
    if (!isNaN(h) && !isNaN(a)) {
      defaultHomeScore = h;
      defaultAwayScore = a;
    }
  }
  return {
    id: l.id,
    name: l.name,
    country: l.country,
    color: l.color,
    logoUrl: l.logo_url || undefined,
    defaultOutcome: l.default_target_outcome || undefined,
    defaultOutcomeScore: l.default_outcome_score || undefined,
    defaultHomeScore,
    defaultAwayScore,
    createdAt: l.created_at,
  };
}
