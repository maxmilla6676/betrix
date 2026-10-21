import type { Match, Team, League } from "@/data/football";
import { isApiSportsEnabled, fetchApiSportsFixtures } from "@/services/apiSports";
import { FREE_SPORTS_SOURCES, parseEspnEvent, scoreboardUrl } from "@/lib/espn";

export { isApiSportsEnabled, fetchApiSportsFixtures } from "@/services/apiSports";
export { FREE_SPORTS_SOURCES, type SportsApiSource } from "@/lib/espn";

// Dynamic store for teams & leagues fetched from APIs
export const dynamicTeams = new Map<string, Team>();
export const dynamicLeagues = new Map<string, League>();
export const dynamicMatchesMap = new Map<string, Match>();

export interface FetchResult {
  matches: Match[];
  liveCount: number;
  sourcesFetched: number;
  error?: string;
}

export async function fetchLiveSportsFixtures(
  selectedSourceIds?: string[],
  targetDateStr?: string,
): Promise<FetchResult> {
  // 1. If API-Sports is enabled, try fetching high-accuracy fixtures from API-Football
  if (isApiSportsEnabled()) {
    try {
      const apiSportsResult = await fetchApiSportsFixtures(targetDateStr);
      if (apiSportsResult.matches.length > 0) {
        return {
          matches: apiSportsResult.matches,
          liveCount: apiSportsResult.liveCount,
          sourcesFetched: 1,
        };
      }
      if (apiSportsResult.error) {
        console.warn("API-Sports notice:", apiSportsResult.error, "- using fallback feed.");
      }
    } catch (err) {
      console.warn("API-Sports error, falling back to public feed:", err);
    }
  }

  const sourcesToFetch =
    selectedSourceIds && selectedSourceIds.length > 0
      ? FREE_SPORTS_SOURCES.filter((s) => selectedSourceIds.includes(s.id))
      : FREE_SPORTS_SOURCES;

  const matches: Match[] = [];
  const seenIds = new Set<string>();
  const seenMatchKeys = new Set<string>();
  let sourcesFetched = 0;

  // Browsers can't call ESPN directly (no CORS headers), so always use our same-origin proxy.
  const viaProxy = typeof window !== "undefined";

  for (const source of sourcesToFetch) {
    try {
      const espnUrl = scoreboardUrl(source, targetDateStr);
      const fetchUrl = viaProxy ? `/api/espn?url=${encodeURIComponent(espnUrl)}` : espnUrl;
      const res = await fetch(fetchUrl);
      if (!res.ok) continue;
      const data = await res.json();
      if (!data.events || !Array.isArray(data.events)) continue;

      sourcesFetched++;

      for (const ev of data.events) {
        const parsed = parseEspnEvent(ev, source, targetDateStr);
        if (!parsed) continue;
        const { match, homeTeam, awayTeam } = parsed;
        if (seenIds.has(match.id)) continue;

        const cleanH = homeTeam.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        const cleanA = awayTeam.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        const matchPairKey = `${cleanH}__vs__${cleanA}`;
        if (seenMatchKeys.has(matchPairKey)) continue;

        seenIds.add(match.id);
        seenMatchKeys.add(matchPairKey);
        dynamicTeams.set(homeTeam.id, homeTeam);
        dynamicTeams.set(awayTeam.id, awayTeam);
        dynamicMatchesMap.set(match.id, match);
        matches.push(match);
      }
    } catch {
      // ignore single source network failure, continue to next
    }
  }

  const liveCount = matches.filter((m) => m.status === "LIVE").length;

  return {
    matches,
    liveCount,
    sourcesFetched,
  };
}
