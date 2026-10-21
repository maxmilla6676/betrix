export type MatchStatus = "SCHEDULED" | "LIVE" | "FINISHED" | "POSTPONED" | "CANCELLED";
import { dynamicTeams, dynamicLeagues, dynamicMatchesMap } from "@/services/sportsApi";
import { todayMidnightGhana, GHANA_TZ } from "@/lib/ghana-time";

export interface Sport {
  id: string;
  slug: string;
  name: string;
  hot?: boolean;
  /** Sports with a draw outcome get a 3-way main market. */
  draw: boolean;
}

export interface League {
  id: string;
  slug: string;
  name: string;
  country: string;
  short: string;
  color: string;
  sportId: string;
  active: boolean;
}

export interface Team {
  id: string;
  name: string;
  short: string;
  country: string;
  leagueId: string;
  color: string;
  /** Simple form string, most recent first */
  form: string[];
  logo?: string;
}

export interface MarketOption {
  id: string;
  label: string;
  multiplier: number;
}

export interface Market {
  id: string;
  name: string;
  status: "ACTIVE" | "SUSPENDED" | "CLOSED";
  options: MarketOption[];
}

export interface Match {
  id: string;
  code?: string; // e.g. #74497
  leagueId: string;
  sportId: string;
  homeId: string;
  awayId: string;
  kickoff: string; // ISO, server-authoritative in production
  status: MatchStatus;
  minute?: number | undefined;
  homeScore?: number | undefined;
  awayScore?: number | undefined;
  venue: string;
  hot: boolean;
  markets: Market[];
}

export const sports: Sport[] = [
  { id: "football", slug: "football", name: "Football", draw: true, hot: true },
  { id: "tabletennis", slug: "table-tennis", name: "Table Tennis", draw: false, hot: true },
  { id: "basketball", slug: "basketball", name: "Basketball", draw: false },
  { id: "baseball", slug: "baseball", name: "Baseball", draw: false },
  { id: "tennis", slug: "tennis", name: "Tennis", draw: false },
];

export const sportById = (id: string) => sports.find((s) => s.id === id)!;

export const leagues: League[] = [
  { id: "l1", slug: "premier-league", name: "Premier League", country: "England", short: "PL", color: "#3D195B", sportId: "football", active: true },
  { id: "l2", slug: "la-liga", name: "La Liga", country: "Spain", short: "LL", color: "#E01A22", sportId: "football", active: true },
  { id: "l3", slug: "serie-a", name: "Serie A", country: "Italy", short: "SA", color: "#0B5EA8", sportId: "football", active: true },
  { id: "l4", slug: "bundesliga", name: "Bundesliga", country: "Germany", short: "BL", color: "#D20515", sportId: "football", active: true },
  { id: "l5", slug: "ligue-1", name: "Ligue 1", country: "France", short: "L1", color: "#0A1A3C", sportId: "football", active: true },
  { id: "l6", slug: "champions-league", name: "Champions League", country: "Europe", short: "UCL", color: "#0B1F5C", sportId: "football", active: true },
  { id: "l7", slug: "world-cup-2026", name: "World Cup 2026", country: "International", short: "WC", color: "#1B7F4C", sportId: "football", active: true },
  { id: "l8", slug: "nba", name: "NBA", country: "USA", short: "NBA", color: "#C8102E", sportId: "basketball", active: true },
  { id: "l9", slug: "mlb", name: "MLB", country: "USA", short: "MLB", color: "#0A2B5C", sportId: "baseball", active: true },
  { id: "l10", slug: "wtt-champions", name: "WTT Champions", country: "International", short: "WTT", color: "#E5721B", sportId: "tabletennis", active: true },
  { id: "l11", slug: "atp-tour", name: "ATP Tour", country: "International", short: "ATP", color: "#1E63C7", sportId: "tennis", active: true },
];

const t = (
  id: string,
  name: string,
  short: string,
  country: string,
  leagueId: string,
  color: string,
  form: string,
): Team => ({ id, name, short, country, leagueId, color, form: form.split("") });

export const teams: Team[] = [
  t("t1", "Manchester United", "MUN", "England", "l1", "#DA291C", "WWLDW"),
  t("t2", "Arsenal", "ARS", "England", "l1", "#EF0107", "WWWDL"),
  t("t3", "Liverpool", "LIV", "England", "l1", "#C8102E", "WDWWW"),
  t("t4", "Manchester City", "MCI", "England", "l1", "#6CABDD", "WWWWD"),
  t("t5", "Chelsea", "CHE", "England", "l1", "#034694", "LWDWL"),
  t("t6", "Tottenham Hotspur", "TOT", "England", "l1", "#132257", "WLWDW"),
  t("t7", "Newcastle United", "NEW", "England", "l1", "#241F20", "DWLWW"),
  t("t8", "Aston Villa", "AVL", "England", "l1", "#95BFE5", "WWDLW"),
  t("t9", "Real Madrid", "RMA", "Spain", "l2", "#FEBE10", "WWWWW"),
  t("t10", "Barcelona", "BAR", "Spain", "l2", "#A50044", "WWDWL"),
  t("t11", "Atlético Madrid", "ATM", "Spain", "l2", "#CB3524", "DWWLW"),
  t("t12", "Sevilla", "SEV", "Spain", "l2", "#D9042B", "LDWLW"),
  t("t13", "Inter Milan", "INT", "Italy", "l3", "#0068A8", "WWWDW"),
  t("t14", "AC Milan", "MIL", "Italy", "l3", "#FB090B", "WLWWD"),
  t("t15", "Juventus", "JUV", "Italy", "l3", "#000000", "DDWWL"),
  t("t16", "Napoli", "NAP", "Italy", "l3", "#12A0D7", "WWLDW"),
  t("t17", "Bayern Munich", "BAY", "Germany", "l4", "#DC052D", "WWWWL"),
  t("t18", "Borussia Dortmund", "BVB", "Germany", "l4", "#FDE100", "WDWLW"),
  t("t19", "RB Leipzig", "RBL", "Germany", "l4", "#DD0741", "LWWDW"),
  t("t20", "Bayer Leverkusen", "B04", "Germany", "l4", "#E32221", "WWWWW"),
  t("t21", "Paris Saint-Germain", "PSG", "France", "l5", "#004170", "WWDWW"),
  t("t22", "Olympique Marseille", "OM", "France", "l5", "#2FAEE0", "DLWWD"),
  t("t23", "AS Monaco", "ASM", "France", "l5", "#E51B22", "WWLWD"),
  t("t24", "Olympique Lyonnais", "OL", "France", "l5", "#1A2B5E", "LWDWW"),
  // World Cup 2026
  t("t25", "Brazil", "BRA", "Brazil", "l7", "#FEDD00", "WWWDW"),
  t("t26", "Argentina", "ARG", "Argentina", "l7", "#75AADB", "WWWWD"),
  t("t27", "England", "ENG", "England", "l7", "#CE1124", "WDWWL"),
  t("t28", "France", "FRA", "France", "l7", "#0055A4", "WWDWW"),
  t("t29", "Ghana", "GHA", "Ghana", "l7", "#006B3F", "WLWDW"),
  t("t30", "Spain", "ESP", "Spain", "l7", "#AA151B", "WWWWW"),
  // NBA
  t("t31", "Boston Celtics", "BOS", "USA", "l8", "#007A33", "WWLWW"),
  t("t32", "Los Angeles Lakers", "LAL", "USA", "l8", "#552583", "LWWDW"),
  t("t33", "Denver Nuggets", "DEN", "USA", "l8", "#0E2240", "WWWLW"),
  t("t34", "Miami Heat", "MIA", "USA", "l8", "#98002E", "LWLWW"),
  // MLB
  t("t35", "New York Yankees", "NYY", "USA", "l9", "#132448", "WWLWL"),
  t("t36", "Los Angeles Dodgers", "LAD", "USA", "l9", "#005A9C", "WWWLW"),
  t("t37", "Chicago Cubs", "CHC", "USA", "l9", "#0E3386", "LWWLW"),
  t("t38", "Houston Astros", "HOU", "USA", "l9", "#EB6E1F", "WLWWW"),
  // Table tennis
  t("t39", "Fan Zhendong", "FZD", "China", "l10", "#D7263D", "WWWWL"),
  t("t40", "Tomokazu Harimoto", "HAR", "Japan", "l10", "#1B3B6F", "WLWWW"),
  t("t41", "Truls Moregard", "MOR", "Sweden", "l10", "#FFCD00", "LWWLW"),
  t("t42", "Hugo Calderano", "CAL", "Brazil", "l10", "#009739", "WWLWW"),
  // Tennis
  t("t43", "Carlos Alcaraz", "ALC", "Spain", "l11", "#FF6B00", "WWWWW"),
  t("t44", "Jannik Sinner", "SIN", "Italy", "l11", "#2E9E4F", "WWWLW"),
  t("t45", "Novak Djokovic", "DJO", "Serbia", "l11", "#1B4D8F", "WLWWW"),
  t("t46", "Daniil Medvedev", "MED", "Russia", "l11", "#7A2E8E", "LWWWL"),
];

export const teamById = (id: string): Team =>
  dynamicTeams.get(id) ||
  teams.find((x) => x.id === id) || {
    id,
    name: id.includes("team") ? "Sports Team" : id,
    short: "TM",
    country: "International",
    leagueId: "l1",
    color: "#3B82F6",
    form: ["W", "D", "W", "L", "W"],
  };

export const leagueById = (id: string): League =>
  dynamicLeagues.get(id) ||
  leagues.find((x) => x.id === id) || {
    id,
    slug: "global-league",
    name: "Live League",
    country: "International",
    short: "LIVE",
    color: "#E41B23",
    sportId: "football",
    active: true,
  };

export const leagueBySlug = (slug: string) => leagues.find((x) => x.slug === slug);

function markets(seed: number, draw: boolean): Market[] {
  const j = (n: number) => Math.round((n + ((seed % 7) - 3) * 0.08) * 100) / 100;
  const main: Market = {
    id: "1x2",
    name: draw ? "Match Result" : "Match Winner",
    status: "ACTIVE",
    options: draw
      ? [
          { id: "home", label: "1", multiplier: j(2.1) },
          { id: "draw", label: "X", multiplier: j(3.3) },
          { id: "away", label: "2", multiplier: j(2.9) },
        ]
      : [
          { id: "home", label: "1", multiplier: j(1.72) },
          { id: "away", label: "2", multiplier: j(2.05) },
        ],
  };

  const list: Market[] = [main];

  if (draw) {
    list.push({
      id: "dc",
      name: "Double Chance",
      status: seed % 9 === 0 ? "SUSPENDED" : "ACTIVE",
      options: [
        { id: "1x", label: "1X", multiplier: j(1.32) },
        { id: "12", label: "12", multiplier: j(1.28) },
        { id: "x2", label: "X2", multiplier: j(1.45) },
      ],
    });
  }

  list.push({
    id: "ou",
    name: "Over / Under 2.5",
    status: "ACTIVE",
    options: [
      { id: "o25", label: "Over 2.5", multiplier: j(1.85) },
      { id: "u25", label: "Under 2.5", multiplier: j(1.95) },
    ],
  });

  if (draw) {
    list.push({
      id: "btts",
      name: "Both Teams To Score",
      status: seed % 11 === 0 ? "CLOSED" : "ACTIVE",
      options: [
        { id: "yes", label: "Yes", multiplier: j(1.72) },
        { id: "no", label: "No", multiplier: j(2.05) },
      ],
    });
  }

  list.push({
    id: "hcp",
    name: "Handicap",
    status: "ACTIVE",
    options: [
      { id: "h-1", label: "Home -1", multiplier: j(3.1) },
      { id: "a+1", label: "Away +1", multiplier: j(1.42) },
    ],
  });

  if (draw) {
    list.push({
      id: "htft",
      name: "Half Time / Full Time",
      status: "ACTIVE",
      options: [
        { id: "hh", label: "1 / 1", multiplier: j(3.4) },
        { id: "xx", label: "X / X", multiplier: j(5.1) },
        { id: "aa", label: "2 / 2", multiplier: j(4.2) },
      ],
    });
  }

  list.push({
    id: "totals",
    name: "Total Goals / Points",
    status: "ACTIVE",
    options: [
      { id: "o15", label: "Over 1.5", multiplier: j(1.28) },
      { id: "u35", label: "Under 3.5", multiplier: j(1.44) },
    ],
  });

  return list;
}

/** Market tabs shown above the odds table, mirroring a sportsbook layout. */
export const marketTabs = [
  { id: "1x2", label: "1X2" },
  { id: "ou", label: "O/U 2.5" },
  { id: "dc", label: "DC" },
  { id: "btts", label: "BTTS" },
  { id: "hcp", label: "Handicap" },
  { id: "htft", label: "HT/FT" },
] as const;

const DAY = 86400000;
/** Base date anchored to Ghana midnight (UTC+0) so demo data is timezone-correct. */
const base = todayMidnightGhana();

export const matches: Match[] = [];

export const matchById = (id: string) => dynamicMatchesMap.get(id);

/** Returns true if a match has started (LIVE), is finished, or kickoff time has passed */
export function isMatchLocked(match?: Match | null): boolean {
  if (!match) return false;
  if (match.status === "LIVE" || match.status === "FINISHED" || match.status === "POSTPONED" || match.status === "CANCELLED") {
    return true;
  }
  if (match.minute !== undefined && match.minute > 0) {
    return true;
  }
  if (match.kickoff) {
    const kickoffMs = new Date(match.kickoff).getTime();
    if (!isNaN(kickoffMs) && kickoffMs <= Date.now()) {
      return true;
    }
  }
  return false;
}

export const liveMatches = () => Array.from(dynamicMatchesMap.values()).filter((m) => m.status === "LIVE");
export const upcomingMatches = () =>
  Array.from(dynamicMatchesMap.values())
    .filter((m) => m.status === "SCHEDULED" && !isMatchLocked(m))
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff));
export const finishedMatches = () => Array.from(dynamicMatchesMap.values()).filter((m) => m.status === "FINISHED");
export const matchesBySport = (sportId: string) => Array.from(dynamicMatchesMap.values()).filter((m) => m.sportId === sportId);

export function standingsFor(leagueId: string) {
  return teams
    .filter((x) => x.leagueId === leagueId)
    .map((team, i) => {
      const played = 24;
      const won = 17 - i * 2;
      const drawn = 4 + (i % 3);
      const lost = played - won - drawn;
      return {
        team,
        played,
        won,
        drawn,
        lost,
        gf: 52 - i * 5,
        ga: 20 + i * 4,
        points: won * 3 + drawn,
      };
    })
    .sort((a, b) => b.points - a.points);
}

export function dayBucket(iso: string): "Today" | "Tomorrow" | "Upcoming" {
  const d = new Date(iso);
  // Compare against Ghana midnight (UTC+0) so bucketing is correct for Ghana users
  const ghMidnight = todayMidnightGhana();
  const diff = Math.floor((d.getTime() - ghMidnight.getTime()) / DAY);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return "Upcoming";
}

export function formatKickoff(iso: string) {
  // Always display in Ghana GMT (Africa/Accra = UTC+0)
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: GHANA_TZ });
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: GHANA_TZ });
}

export function formatDayLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: GHANA_TZ });
}

/** Landing categories shown as coloured tiles on the home page. */
export const categories = [
  { slug: "today", title: "TODAY'S", subtitle: "FOOTBALL", accent: "#1DB954" },
  { slug: "worldcup", title: "WORLD CUP", subtitle: "2026", accent: "#3B6FE0" },
  { slug: "nba", title: "NBA", subtitle: "BASKETBALL", accent: "#8B5CF6" },
  { slug: "mlb", title: "MLB", subtitle: "BASEBALL", accent: "#E5721B" },
  { slug: "tabletennis", title: "TABLE", subtitle: "TENNIS", accent: "#E0483B" },
] as const;

export function matchesForCategory(slug: string): Match[] {
  const all = Array.from(dynamicMatchesMap.values());
  switch (slug) {
    case "today":
      return all.filter((m) => m.sportId === "football" && dayBucket(m.kickoff) === "Today");
    case "worldcup":
      return all.filter((m) => m.leagueId === "l7" || m.leagueId === "l6");
    case "nba":
      return all.filter((m) => m.sportId === "basketball" || m.leagueId === "l8");
    case "mlb":
      return all.filter((m) => m.sportId === "baseball" || m.leagueId === "l9");
    case "tabletennis":
      return all.filter((m) => m.sportId === "tabletennis" || m.sportId === "tennis");
    default:
      return all;
  }
}
