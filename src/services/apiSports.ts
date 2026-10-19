import type { Match, Team, League, Market, MatchStatus } from "@/data/football";
import { dynamicTeams, dynamicLeagues, dynamicMatchesMap } from "@/services/sportsApi";

export const API_SPORTS_STORAGE_KEY = "betrix_apisports_key";
export const API_SPORTS_PROVIDER_KEY = "betrix_apisports_provider"; // "direct" | "rapidapi"
export const API_SPORTS_ENABLED_KEY = "betrix_apisports_enabled";

const DIRECT_BASE_URL = "https://v3.football.api-sports.io";
const RAPIDAPI_BASE_URL = "https://api-football-v1.p.rapidapi.com/v3";
const RAPIDAPI_HOST = "api-football-v1.p.rapidapi.com";

export interface ApiSportsAccountStatus {
  success: boolean;
  email?: string;
  plan?: string;
  requestsUsed?: number;
  requestsLimit?: number;
  requestsRemaining?: number;
  error?: string;
}

export function getApiSportsKey(): string {
  if (typeof window === "undefined") return "";
  const stored = localStorage.getItem(API_SPORTS_STORAGE_KEY);
  if (stored && stored.trim().length > 0) return stored.trim();
  const envKey = (import.meta as any).env?.VITE_API_SPORTS_KEY;
  if (envKey && envKey.trim().length > 0) return envKey.trim();
  return "";
}

export function setApiSportsKey(key: string): void {
  if (typeof window === "undefined") return;
  if (!key) {
    localStorage.removeItem(API_SPORTS_STORAGE_KEY);
  } else {
    localStorage.setItem(API_SPORTS_STORAGE_KEY, key.trim());
  }
}

export function isApiSportsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const flag = localStorage.getItem(API_SPORTS_ENABLED_KEY);
  if (flag === "false") return false;
  return getApiSportsKey().length > 0;
}

export function setApiSportsEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(API_SPORTS_ENABLED_KEY, enabled ? "true" : "false");
}

function getRequestHeaders(key: string, provider: "direct" | "rapidapi" = "direct"): HeadersInit {
  if (provider === "rapidapi") {
    return {
      "x-rapidapi-key": key,
      "x-rapidapi-host": RAPIDAPI_HOST,
    };
  }
  return {
    "x-apisports-key": key,
  };
}

export async function testApiSportsConnection(apiKey?: string): Promise<ApiSportsAccountStatus> {
  const key = apiKey || getApiSportsKey();
  if (!key) {
    return { success: false, error: "No API-Sports key provided" };
  }

  try {
    const res = await fetch(`${DIRECT_BASE_URL}/status`, {
      headers: getRequestHeaders(key, "direct"),
    });

    if (!res.ok) {
      // Try RapidAPI fallback format if direct failed
      const rapidRes = await fetch(`${RAPIDAPI_BASE_URL}/status`, {
        headers: getRequestHeaders(key, "rapidapi"),
      });

      if (!rapidRes.ok) {
        return { success: false, error: `HTTP ${res.status}: Failed to connect to API-Sports` };
      }

      const rapidData = await rapidRes.json();
      if (rapidData.errors && Object.keys(rapidData.errors).length > 0) {
        const errMsg = typeof rapidData.errors === "object" ? Object.values(rapidData.errors).join(", ") : String(rapidData.errors);
        return { success: false, error: errMsg };
      }

      const reqs = rapidData.response?.requests;
      return {
        success: true,
        email: rapidData.response?.account?.email || "RapidAPI User",
        plan: rapidData.response?.subscription?.plan || "Free",
        requestsUsed: reqs?.current ?? 0,
        requestsLimit: reqs?.limit_day ?? 100,
        requestsRemaining: Math.max(0, (reqs?.limit_day ?? 100) - (reqs?.current ?? 0)),
      };
    }

    const data = await res.json();
    if (data.errors && Object.keys(data.errors).length > 0) {
      const errMsg = typeof data.errors === "object" ? Object.values(data.errors).join(", ") : String(data.errors);
      return { success: false, error: errMsg };
    }

    const account = data.response?.account;
    const sub = data.response?.subscription;
    const reqs = data.response?.requests;

    const used = reqs?.current ?? 0;
    const limit = reqs?.limit_day ?? 100;

    return {
      success: true,
      email: account?.email || `${account?.firstname || "User"} ${account?.lastname || ""}`.trim() || "API-Sports User",
      plan: sub?.plan || "Free",
      requestsUsed: used,
      requestsLimit: limit,
      requestsRemaining: Math.max(0, limit - used),
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error reaching API-Sports" };
  }
}

// In-memory and SessionStorage cache to protect user quota (100 reqs/day)
const FIXTURE_CACHE_PREFIX = "betrix_apisports_cache_";
const FIXTURE_TTL_MS = 8 * 60 * 1000; // 8 minutes for scheduled fixtures
const LIVE_TTL_MS = 45 * 1000; // 45 seconds for live matches

function getCachedData<T>(cacheKey: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const item = sessionStorage.getItem(FIXTURE_CACHE_PREFIX + cacheKey);
    if (!item) return null;
    const parsed = JSON.parse(item);
    if (Date.now() - parsed.ts < parsed.ttl) {
      return parsed.data as T;
    }
    sessionStorage.removeItem(FIXTURE_CACHE_PREFIX + cacheKey);
  } catch {
    // Ignore cache parse error
  }
  return null;
}

function setCachedData<T>(cacheKey: string, data: T, ttl: number): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      FIXTURE_CACHE_PREFIX + cacheKey,
      JSON.stringify({ ts: Date.now(), ttl, data })
    );
  } catch {
    // SessionStorage full or unavailable
  }
}

export function clearApiSportsCache(): void {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(FIXTURE_CACHE_PREFIX)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // ignore
  }
}

function stringHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Map known API-Sports league IDs to BETRIX standard league IDs or generate clean dynamic league
const LEAGUE_MAP: Record<number, { id: string; name: string; country: string; color: string }> = {
  39: { id: "l1", name: "Premier League", country: "England", color: "#3D195B" },
  140: { id: "l2", name: "La Liga", country: "Spain", color: "#E01A22" },
  135: { id: "l3", name: "Serie A", country: "Italy", color: "#0B5EA8" },
  78: { id: "l4", name: "Bundesliga", country: "Germany", color: "#D20515" },
  61: { id: "l5", name: "Ligue 1", country: "France", color: "#0A1A3C" },
  2: { id: "l6", name: "Champions League", country: "Europe", color: "#0B1F5C" },
  3: { id: "l6", name: "Europa League", country: "Europe", color: "#F68E1E" },
  253: { id: "l8", name: "MLS", country: "USA", color: "#002B49" },
  88: { id: "l-eredivisie", name: "Eredivisie", country: "Netherlands", color: "#1F4788" },
  94: { id: "l-primeira", name: "Primeira Liga", country: "Portugal", color: "#FFD700" },
};

function generateRealisticMarketsForFixture(
  matchId: string,
  homeName: string,
  awayName: string
): Market[] {
  const hash = stringHash(`${homeName}-${awayName}-${matchId}`);
  const r = (base: number, mod: number) => {
    const raw = base + ((hash % 11) - 5) * 0.06 + mod * 0.05;
    return Math.max(1.15, Math.round(raw * 100) / 100);
  };

  return [
    {
      id: "1x2",
      name: "Match Result",
      status: "ACTIVE",
      options: [
        { id: `${matchId}_1`, label: "1", multiplier: r(2.10, 1) },
        { id: `${matchId}_x`, label: "X", multiplier: r(3.30, 2) },
        { id: `${matchId}_2`, label: "2", multiplier: r(3.10, 3) },
      ],
    },
    {
      id: "dc",
      name: "Double Chance",
      status: "ACTIVE",
      options: [
        { id: `${matchId}_1x`, label: "1X", multiplier: r(1.28, 0.4) },
        { id: `${matchId}_12`, label: "12", multiplier: r(1.24, 0.3) },
        { id: `${matchId}_x2`, label: "X2", multiplier: r(1.52, 0.5) },
      ],
    },
    {
      id: "ou",
      name: "Over / Under 2.5",
      status: "ACTIVE",
      options: [
        { id: `${matchId}_o25`, label: "Over 2.5", multiplier: r(1.80, 1) },
        { id: `${matchId}_u25`, label: "Under 2.5", multiplier: r(1.95, 2) },
      ],
    },
    {
      id: "btts",
      name: "Both Teams To Score",
      status: "ACTIVE",
      options: [
        { id: `${matchId}_btts_yes`, label: "Yes", multiplier: r(1.68, 1) },
        { id: `${matchId}_btts_no`, label: "No", multiplier: r(2.12, 2) },
      ],
    },
    {
      id: "hcp",
      name: "Handicap",
      status: "ACTIVE",
      options: [
        { id: `${matchId}_h1`, label: "Home -1", multiplier: r(3.40, 2) },
        { id: `${matchId}_a1`, label: "Away +1", multiplier: r(1.38, 1) },
      ],
    },
  ];
}

export async function fetchApiSportsFixtures(
  targetDateStr?: string,
  liveOnly = false
): Promise<{ matches: Match[]; liveCount: number; error?: string }> {
  const key = getApiSportsKey();
  if (!key) {
    return { matches: [], liveCount: 0, error: "API-Sports key not configured" };
  }

  // Format date: API-Sports requires YYYY-MM-DD
  let dateParam = targetDateStr;
  if (!dateParam) {
    const now = new Date();
    dateParam = now.toISOString().split("T")[0];
  } else if (dateParam.length === 8 && /^\d{8}$/.test(dateParam)) {
    // Convert YYYYMMDD to YYYY-MM-DD
    dateParam = `${dateParam.slice(0, 4)}-${dateParam.slice(4, 6)}-${dateParam.slice(6, 8)}`;
  }

  const cacheKey = liveOnly ? "live_fixtures" : `fixtures_${dateParam}`;
  const cached = getCachedData<Match[]>(cacheKey);
  if (cached && cached.length > 0) {
    // Re-register teams & leagues in maps
    cached.forEach((m) => dynamicMatchesMap.set(m.id, m));
    return {
      matches: cached,
      liveCount: cached.filter((m) => m.status === "LIVE").length,
    };
  }

  try {
    const url = liveOnly
      ? `${DIRECT_BASE_URL}/fixtures?live=all`
      : `${DIRECT_BASE_URL}/fixtures?date=${dateParam}`;

    const res = await fetch(url, {
      headers: getRequestHeaders(key, "direct"),
    });

    if (!res.ok) {
      return { matches: [], liveCount: 0, error: `HTTP ${res.status} from API-Sports` };
    }

    const data = await res.json();
    if (data.errors && Object.keys(data.errors).length > 0) {
      const errMsg = typeof data.errors === "object" ? Object.values(data.errors).join(", ") : String(data.errors);
      return { matches: [], liveCount: 0, error: errMsg };
    }

    const rawList = data.response;
    if (!Array.isArray(rawList) || rawList.length === 0) {
      return { matches: [], liveCount: 0 };
    }

    const matches: Match[] = [];

    // Sort to prioritize top European leagues and active matches
    const topLeagueIds = [39, 140, 135, 78, 61, 2, 3];
    const sortedList = [...rawList].sort((a, b) => {
      const aTop = topLeagueIds.includes(a.league?.id) ? 1 : 0;
      const bTop = topLeagueIds.includes(b.league?.id) ? 1 : 0;
      if (aTop !== bTop) return bTop - aTop;
      return (b.fixture?.timestamp || 0) - (a.fixture?.timestamp || 0);
    });

    // Limit to top 60 matches to avoid memory/DOM bloat
    const selectedFixtures = sortedList.slice(0, 60);

    for (const item of selectedFixtures) {
      const fix = item.fixture;
      const lg = item.league;
      const t = item.teams;
      const goals = item.goals;

      if (!fix || !t?.home || !t?.away || !lg) continue;

      // League resolution
      const mappedLeague = LEAGUE_MAP[lg.id];
      const leagueId = mappedLeague ? mappedLeague.id : `api-l-${lg.id}`;
      const leagueName = mappedLeague ? mappedLeague.name : (lg.name || "World League");
      const leagueColor = mappedLeague ? mappedLeague.color : "#3D195B";

      if (!dynamicLeagues.has(leagueId)) {
        dynamicLeagues.set(leagueId, {
          id: leagueId,
          slug: lg.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") || `league-${lg.id}`,
          name: leagueName,
          country: lg.country || "International",
          short: leagueName.substring(0, 3).toUpperCase(),
          color: leagueColor,
          sportId: "football",
          active: true,
          logo: lg.logo,
        });
      }

      // Teams resolution
      const homeId = `api-team-${t.home.id}`;
      const awayId = `api-team-${t.away.id}`;

      const homeTeam: Team = {
        id: homeId,
        name: t.home.name || "Home Team",
        short: (t.home.name?.substring(0, 3) || "HOM").toUpperCase(),
        country: lg.country || "International",
        leagueId,
        color: leagueColor,
        form: ["W", "D", "W", "L", "W"],
        logo: t.home.logo,
      };

      const awayTeam: Team = {
        id: awayId,
        name: t.away.name || "Away Team",
        short: (t.away.name?.substring(0, 3) || "AWY").toUpperCase(),
        country: lg.country || "International",
        leagueId,
        color: leagueColor,
        form: ["L", "W", "D", "W", "W"],
        logo: t.away.logo,
      };

      dynamicTeams.set(homeId, homeTeam);
      dynamicTeams.set(awayId, awayTeam);

      // Status mapping
      const shortStatus = (fix.status?.short || "NS").toUpperCase();
      let status: MatchStatus = "SCHEDULED";
      let minute: number | undefined = undefined;

      const liveStatuses = ["1H", "HT", "2H", "ET", "BT", "P", "INT", "LIVE"];
      const finishedStatuses = ["FT", "AET", "PEN", "PST", "CANC", "ABD", "AWD", "WO"];

      if (liveStatuses.includes(shortStatus)) {
        status = "LIVE";
        minute = fix.status?.elapsed || 35;
      } else if (finishedStatuses.includes(shortStatus)) {
        status = "FINISHED";
      }

      const homeScore = goals.home != null ? goals.home : undefined;
      const awayScore = goals.away != null ? goals.away : undefined;

      const matchId = `apisports-${fix.id}`;
      const venueName = fix.venue?.name
        ? `${fix.venue.name}${fix.venue.city ? `, ${fix.venue.city}` : ""}`
        : "Stadium Arena";

      const matchCode = `#${70000 + (fix.id % 29000)}`;

      const match: Match = {
        id: matchId,
        code: matchCode,
        leagueId,
        sportId: "football",
        homeId,
        awayId,
        kickoff: fix.date || new Date().toISOString(),
        status,
        minute,
        homeScore,
        awayScore,
        venue: venueName,
        hot: topLeagueIds.includes(lg.id),
        markets: generateRealisticMarketsForFixture(matchId, homeTeam.name, awayTeam.name),
      };

      dynamicMatchesMap.set(matchId, match);
      matches.push(match);
    }

    // Cache the result
    setCachedData(cacheKey, matches, liveOnly ? LIVE_TTL_MS : FIXTURE_TTL_MS);

    const liveCount = matches.filter((m) => m.status === "LIVE").length;
    return { matches, liveCount };
  } catch (err: any) {
    return { matches: [], liveCount: 0, error: err.message || "Failed to fetch from API-Sports" };
  }
}
