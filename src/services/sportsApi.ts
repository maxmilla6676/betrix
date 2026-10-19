import type { Match, Team, League, Market, MatchStatus } from "@/data/football";
import { isApiSportsEnabled, fetchApiSportsFixtures } from "@/services/apiSports";

export { isApiSportsEnabled, fetchApiSportsFixtures } from "@/services/apiSports";

export interface SportsApiSource {
  id: string;
  name: string;
  url: string;
  sportId: string;
  leagueId: string;
  leagueName: string;
  country: string;
  color: string;
}

export const FREE_SPORTS_SOURCES: SportsApiSource[] = [
  {
    id: "eng.1",
    name: "Premier League",
    url: "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard",
    sportId: "football",
    leagueId: "l1",
    leagueName: "Premier League",
    country: "England",
    color: "#3D195B",
  },
  {
    id: "esp.1",
    name: "La Liga",
    url: "https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard",
    sportId: "football",
    leagueId: "l2",
    leagueName: "La Liga",
    country: "Spain",
    color: "#E01A22",
  },
  {
    id: "ita.1",
    name: "Serie A",
    url: "https://site.api.espn.com/apis/site/v2/sports/soccer/ita.1/scoreboard",
    sportId: "football",
    leagueId: "l3",
    leagueName: "Serie A",
    country: "Italy",
    color: "#0B5EA8",
  },
  {
    id: "ger.1",
    name: "Bundesliga",
    url: "https://site.api.espn.com/apis/site/v2/sports/soccer/ger.1/scoreboard",
    sportId: "football",
    leagueId: "l4",
    leagueName: "Bundesliga",
    country: "Germany",
    color: "#D20515",
  },
  {
    id: "uefa.champions",
    name: "Champions League",
    url: "https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard",
    sportId: "football",
    leagueId: "l6",
    leagueName: "Champions League",
    country: "Europe",
    color: "#0B1F5C",
  },
  {
    id: "soccer.all",
    name: "World Football",
    url: "https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard",
    sportId: "football",
    leagueId: "l7",
    leagueName: "World Football",
    country: "International",
    color: "#1B7F4C",
  },
  {
    id: "nba",
    name: "NBA",
    url: "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
    sportId: "basketball",
    leagueId: "l8",
    leagueName: "NBA",
    country: "USA",
    color: "#C8102E",
  },
  {
    id: "mlb",
    name: "MLB",
    url: "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard",
    sportId: "baseball",
    leagueId: "l9",
    leagueName: "MLB",
    country: "USA",
    color: "#0A2B5C",
  },
  {
    id: "tennis.atp",
    name: "ATP Tour",
    url: "https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard",
    sportId: "tennis",
    leagueId: "l11",
    leagueName: "ATP Tour",
    country: "International",
    color: "#1E63C7",
  },
];

// Dynamic store for teams & leagues fetched from APIs
export const dynamicTeams = new Map<string, Team>();
export const dynamicLeagues = new Map<string, League>();
export const dynamicMatchesMap = new Map<string, Match>();

function stringHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function generateMarketsForApiMatch(matchId: string, draw: boolean, seedStr: string): Market[] {
  const hash = stringHash(seedStr || matchId);
  const j = (base: number, modifier: number) => {
    const raw = base + ((hash % 13) - 6) * 0.05 + modifier * 0.04;
    return Math.max(1.10, Math.round(raw * 100) / 100);
  };

  const main: Market = {
    id: "1x2",
    name: draw ? "Match Result" : "Match Winner",
    status: "ACTIVE",
    options: draw
      ? [
          { id: "home", label: "1", multiplier: j(2.15, 1) },
          { id: "draw", label: "X", multiplier: j(3.35, 2) },
          { id: "away", label: "2", multiplier: j(2.85, 3) },
        ]
      : [
          { id: "home", label: "1", multiplier: j(1.75, 1) },
          { id: "away", label: "2", multiplier: j(2.05, 2) },
        ],
  };

  const list: Market[] = [main];

  if (draw) {
    list.push({
      id: "dc",
      name: "Double Chance",
      status: "ACTIVE",
      options: [
        { id: "1x", label: "1X", multiplier: j(1.30, 0.5) },
        { id: "12", label: "12", multiplier: j(1.25, 0.4) },
        { id: "x2", label: "X2", multiplier: j(1.48, 0.6) },
      ],
    });
  }

  list.push({
    id: "ou",
    name: "Over / Under 2.5",
    status: "ACTIVE",
    options: [
      { id: "o25", label: "Over 2.5", multiplier: j(1.82, 1) },
      { id: "u25", label: "Under 2.5", multiplier: j(1.98, 2) },
    ],
  });

  if (draw) {
    list.push({
      id: "btts",
      name: "Both Teams To Score",
      status: "ACTIVE",
      options: [
        { id: "yes", label: "Yes", multiplier: j(1.70, 1) },
        { id: "no", label: "No", multiplier: j(2.10, 2) },
      ],
    });
  }

  list.push({
    id: "hcp",
    name: "Handicap",
    status: "ACTIVE",
    options: [
      { id: "h-1", label: "Home -1", multiplier: j(3.20, 2) },
      { id: "a+1", label: "Away +1", multiplier: j(1.40, 1) },
    ],
  });

  return list;
}

export interface FetchResult {
  matches: Match[];
  liveCount: number;
  sourcesFetched: number;
  error?: string;
}

export async function fetchLiveSportsFixtures(selectedSourceIds?: string[], targetDateStr?: string): Promise<FetchResult> {
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

  const sourcesToFetch = selectedSourceIds && selectedSourceIds.length > 0
    ? FREE_SPORTS_SOURCES.filter((s) => selectedSourceIds.includes(s.id))
    : FREE_SPORTS_SOURCES;

  const matches: Match[] = [];
  let sourcesFetched = 0;

  for (const source of sourcesToFetch) {
    try {
      let fetchUrl = source.url;
      if (targetDateStr) {
        fetchUrl += (fetchUrl.includes("?") ? "&" : "?") + `dates=${targetDateStr}`;
      }
      const res = await fetch(fetchUrl);
      if (!res.ok) continue;
      const data = await res.json();
      if (!data.events || !Array.isArray(data.events)) continue;

      sourcesFetched++;

      for (const ev of data.events) {
        const comp = ev.competitions?.[0];
        if (!comp || !comp.competitors || comp.competitors.length < 2) continue;

        const homeComp = comp.competitors.find((c: any) => c.homeAway === "home") || comp.competitors[0];
        const awayComp = comp.competitors.find((c: any) => c.homeAway === "away") || comp.competitors[1];

        const homeTeamObj = homeComp.team || {};
        const awayTeamObj = awayComp.team || {};

        const homeId = `api-team-${homeTeamObj.id || stringHash(homeTeamObj.name || "home")}`;
        const awayId = `api-team-${awayTeamObj.id || stringHash(awayTeamObj.name || "away")}`;

        const homeTeam: Team = {
          id: homeId,
          name: homeTeamObj.displayName || homeTeamObj.name || "Home Team",
          short: (homeTeamObj.abbreviation || homeTeamObj.name?.substring(0, 3) || "HOM").toUpperCase(),
          country: source.country,
          leagueId: source.leagueId,
          color: source.color,
          form: homeComp.form ? homeComp.form.split("") : ["W", "D", "W", "L", "W"],
          logo: homeTeamObj.logo,
        };

        const awayTeam: Team = {
          id: awayId,
          name: awayTeamObj.displayName || awayTeamObj.name || "Away Team",
          short: (awayTeamObj.abbreviation || awayTeamObj.name?.substring(0, 3) || "AWY").toUpperCase(),
          country: source.country,
          leagueId: source.leagueId,
          color: source.color,
          form: awayComp.form ? awayComp.form.split("") : ["L", "W", "D", "W", "W"],
          logo: awayTeamObj.logo,
        };

        dynamicTeams.set(homeId, homeTeam);
        dynamicTeams.set(awayId, awayTeam);

        // Status mapping
        const stateStr = ev.status?.type?.state || "pre";
        let status: MatchStatus = "SCHEDULED";
        if (stateStr === "in") {
          status = "LIVE";
        } else if (stateStr === "post") {
          status = "FINISHED";
        }

        // Minute / Clock parsing
        let minute: number | undefined = undefined;
        if (status === "LIVE") {
          const displayClock = ev.status?.displayClock || "";
          const matchMin = parseInt(displayClock, 10);
          if (!isNaN(matchMin)) {
            minute = matchMin;
          } else if (ev.status?.clock) {
            minute = Math.floor(ev.status.clock / 60);
          } else {
            minute = 35; // reasonable fallback live minute
          }
        }

        const homeScore = homeComp.score != null ? parseInt(homeComp.score, 10) : undefined;
        const awayScore = awayComp.score != null ? parseInt(awayComp.score, 10) : undefined;

        const matchId = `api-${ev.id}`;
        const venueName = comp.venue?.fullName
          ? `${comp.venue.fullName}${comp.venue.address?.city ? `, ${comp.venue.address.city}` : ""}`
          : "Standard Arena";

        const matchCode = `#${70000 + (stringHash(ev.id) % 29000)}`;

        const match: Match = {
          id: matchId,
          code: matchCode,
          leagueId: source.leagueId,
          sportId: source.sportId,
          homeId,
          awayId,
          kickoff: ev.date || comp.date || new Date().toISOString(),
          status,
          minute,
          homeScore: isNaN(homeScore!) ? undefined : homeScore,
          awayScore: isNaN(awayScore!) ? undefined : awayScore,
          venue: venueName,
          hot: true,
          markets: generateMarketsForApiMatch(matchId, source.sportId === "football", `${homeTeam.name}-${awayTeam.name}`),
        };

        dynamicMatchesMap.set(matchId, match);
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
