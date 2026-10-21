import type { Match, MatchStatus, Market, Team, League } from "@/data/football";
import { stringHash } from "@/lib/espn";
import { dynamicTeams, dynamicLeagues, dynamicMatchesMap } from "@/services/sportsApi";

export interface AdminLeague {
  id: string;
  name: string;
  country: string;
  color: string;
  logoUrl?: string | undefined;
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
  /** Real score entered by an admin. Required before a match can be marked finished. */
  homeScore?: number | undefined;
  awayScore?: number | undefined;
  createdAt: string;
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
export function buildAdminMatch(am: AdminMatch, leaguesList: AdminLeague[]): ConvertedAdminMatch {
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

  // Status comes only from the admin. Kickoff time still locks betting (isMatchLocked).
  const status: MatchStatus =
    am.status === "finished"
      ? "FINISHED"
      : am.status === "live"
        ? "LIVE"
        : am.status === "cancelled"
          ? "CANCELLED"
          : "SCHEDULED";

  const hasScore = typeof am.homeScore === "number" && typeof am.awayScore === "number";

  const match: Match = {
    id: am.id,
    code: `#${50000 + (stringHash(am.id) % 49000)}`,
    leagueId: am.leagueId,
    sportId: "football",
    homeId,
    awayId,
    kickoff: adminKickoffIso(am),
    status,
    minute: undefined,
    homeScore: hasScore && status !== "SCHEDULED" ? am.homeScore : undefined,
    awayScore: hasScore && status !== "SCHEDULED" ? am.awayScore : undefined,
    venue: `${am.homeTeam} Arena`,
    hot: true,
    markets: generateAdminMatchMarkets(am),
  };

  return { match, league, homeTeam, awayTeam };
}

/** Browser helper: converts and registers teams/league so UI lookups resolve. */
export function convertAdminMatchToMatch(am: AdminMatch, leaguesList: AdminLeague[]): Match {
  const { match, league, homeTeam, awayTeam } = buildAdminMatch(am, leaguesList);
  if (league) dynamicLeagues.set(league.id, league);
  dynamicTeams.set(homeTeam.id, homeTeam);
  dynamicTeams.set(awayTeam.id, awayTeam);
  dynamicMatchesMap.set(match.id, match);
  return match;
}

/** Row mapping shared by browser and server. */
export function adminMatchFromRow(m: any): AdminMatch {
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
    homeScore: typeof m.home_score === "number" ? m.home_score : undefined,
    awayScore: typeof m.away_score === "number" ? m.away_score : undefined,
    createdAt: m.created_at,
  };
}

export function adminLeagueFromRow(l: any): AdminLeague {
  return {
    id: l.id,
    name: l.name,
    country: l.country,
    color: l.color,
    logoUrl: l.logo_url || undefined,
    createdAt: l.created_at,
  };
}
