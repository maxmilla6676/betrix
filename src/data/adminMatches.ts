import type { Match, MatchStatus, Market, Team, League } from "@/data/football";
import { dynamicTeams, dynamicLeagues, dynamicMatchesMap } from "@/services/sportsApi";

export interface AdminLeague {
  id: string;
  name: string;
  country: string;
  color: string;
  logoUrl?: string;
  createdAt: string;
}

export interface AdminMatch {
  id: string;
  leagueId: string;
  homeTeam: string;
  awayTeam: string;
  homeLogoUrl?: string;
  awayLogoUrl?: string;
  kickoffDate: string; // "YYYY-MM-DD"
  kickoffTime: string; // "HH:mm"
  outcome: "home" | "draw" | "away" | "score";
  outcomeScore?: string; // e.g. "2:1"
  status: "scheduled" | "live" | "finished";
  createdAt: string;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function generateAdminMatchMarkets(matchId: string, targetH: number, targetA: number): Market[] {
  let homeOdds = 2.05;
  let drawOdds = 3.35;
  let awayOdds = 3.25;

  if (targetH > targetA) {
    homeOdds = 1.62;
    drawOdds = 3.75;
    awayOdds = 5.20;
  } else if (targetH < targetA) {
    homeOdds = 4.80;
    drawOdds = 3.60;
    awayOdds = 1.70;
  } else {
    homeOdds = 2.85;
    drawOdds = 3.10;
    awayOdds = 2.75;
  }

  const m1X2: Market = {
    id: "1x2",
    name: "Match Result",
    status: "ACTIVE",
    options: [
      { id: `${matchId}_1`, label: "1", multiplier: homeOdds },
      { id: `${matchId}_x`, label: "X", multiplier: drawOdds },
      { id: `${matchId}_2`, label: "2", multiplier: awayOdds },
    ],
  };

  const totalGoals = targetH + targetA;
  const mOU: Market = {
    id: "ou",
    name: "Over / Under 2.5",
    status: "ACTIVE",
    options: [
      { id: `${matchId}_o25`, label: "Over 2.5", multiplier: totalGoals >= 3 ? 1.75 : 2.10 },
      { id: `${matchId}_u25`, label: "Under 2.5", multiplier: totalGoals >= 3 ? 2.05 : 1.72 },
    ],
  };

  const mBTTS: Market = {
    id: "btts",
    name: "Both Teams To Score",
    status: "ACTIVE",
    options: [
      { id: `${matchId}_btts_yes`, label: "Yes", multiplier: targetH > 0 && targetA > 0 ? 1.65 : 2.15 },
      { id: `${matchId}_btts_no`, label: "No", multiplier: targetH > 0 && targetA > 0 ? 2.20 : 1.62 },
    ],
  };

  const mDC: Market = {
    id: "dc",
    name: "Double Chance",
    status: "ACTIVE",
    options: [
      { id: `${matchId}_1x`, label: "1X", multiplier: targetH >= targetA ? 1.15 : 1.82 },
      { id: `${matchId}_12`, label: "12", multiplier: 1.24 },
      { id: `${matchId}_x2`, label: "X2", multiplier: targetA >= targetH ? 1.18 : 1.92 },
    ],
  };

  const mHCP: Market = {
    id: "hcp",
    name: "Handicap",
    status: "ACTIVE",
    options: [
      { id: `${matchId}_h1`, label: "Home -1", multiplier: 2.85 },
      { id: `${matchId}_a1`, label: "Away +1", multiplier: 1.42 },
    ],
  };

  // Correct score market with realistically varied odds (NOT all 100!)
  const targetScoreStr = `${targetH}:${targetA}`;
  const baseScores = [
    { score: "1:0", base: 6.50 },
    { score: "2:0", base: 8.50 },
    { score: "2:1", base: 9.00 },
    { score: "3:0", base: 14.00 },
    { score: "3:1", base: 18.00 },
    { score: "3:2", base: 34.00 },
    { score: "0:0", base: 7.20 },
    { score: "1:1", base: 6.40 },
    { score: "2:2", base: 16.50 },
    { score: "0:1", base: 7.80 },
    { score: "0:2", base: 10.50 },
    { score: "1:2", base: 11.20 },
    { score: "0:3", base: 22.00 },
    { score: "1:3", base: 25.00 },
  ];

  if (!baseScores.some((s) => s.score === targetScoreStr)) {
    baseScores.push({ score: targetScoreStr, base: 12.00 });
  }

  const mCS: Market = {
    id: "cs",
    name: "Correct Score",
    status: "ACTIVE",
    options: baseScores.map((s) => ({
      id: `cs-${s.score}`,
      label: s.score,
      multiplier: s.score === targetScoreStr ? Math.max(2.5, Number((s.base * 0.88).toFixed(2))) : s.base,
    })),
  };

  return [m1X2, mOU, mBTTS, mDC, mHCP, mCS];
}

export function convertAdminMatchToMatch(
  am: AdminMatch,
  leaguesList: AdminLeague[],
  nowMs: number = Date.now()
): Match {
  const homeId = `adm-team-h-${am.id}`;
  const awayId = `adm-team-a-${am.id}`;
  const league = leaguesList.find((l) => l.id === am.leagueId);

  // 1. Dynamic League Registration
  if (league) {
    const lgObj: League = {
      id: league.id,
      slug: league.id,
      name: league.name,
      country: league.country || "International",
      short: (league.name.slice(0, 3) || "LGE").toUpperCase(),
      color: league.color || "#E41B23",
      sportId: "football",
      active: true,
      logo: league.logoUrl || undefined,
    };
    dynamicLeagues.set(league.id, lgObj);
  }

  // 2. Dynamic Team Registrations
  const homeTeamObj: Team = {
    id: homeId,
    name: am.homeTeam,
    short: (am.homeTeam.slice(0, 3) || "HOM").toUpperCase(),
    country: league?.country || "International",
    leagueId: am.leagueId,
    color: league?.color || "#E41B23",
    form: ["W", "W", "D", "W", "L"],
    logo: am.homeLogoUrl || undefined,
  };
  dynamicTeams.set(homeId, homeTeamObj);

  const awayTeamObj: Team = {
    id: awayId,
    name: am.awayTeam,
    short: (am.awayTeam.slice(0, 3) || "AWY").toUpperCase(),
    country: league?.country || "International",
    leagueId: am.leagueId,
    color: "#3B82F6",
    form: ["W", "D", "L", "W", "W"],
    logo: am.awayLogoUrl || undefined,
  };
  dynamicTeams.set(awayId, awayTeamObj);

  // 3. Kickoff Time ISO (Ghana is UTC+0)
  // Ensure valid date and time string
  const validDate = am.kickoffDate || new Date().toISOString().slice(0, 10);
  const validTime = am.kickoffTime || "15:00";
  const kickoffIso = `${validDate}T${validTime}:00.000Z`;
  const kickoffMs = new Date(kickoffIso).getTime();
  const matchDurationMs = 105 * 60 * 1000; // 90 min + 15 min half time

  // 4. Target Predetermined Outcome
  let targetH = 1;
  let targetA = 0;
  if (am.outcome === "score" && am.outcomeScore && am.outcomeScore.includes(":")) {
    const [h, a] = am.outcomeScore.split(":").map((v) => parseInt(v.trim(), 10));
    targetH = isNaN(h) ? 1 : h;
    targetA = isNaN(a) ? 0 : a;
  } else if (am.outcome === "home") {
    if (am.outcomeScore && am.outcomeScore.includes(":")) {
      const [h, a] = am.outcomeScore.split(":").map((v) => parseInt(v.trim(), 10));
      targetH = isNaN(h) ? 2 : h;
      targetA = isNaN(a) ? 1 : a;
    } else {
      targetH = 2;
      targetA = 1;
    }
  } else if (am.outcome === "draw") {
    if (am.outcomeScore && am.outcomeScore.includes(":")) {
      const [h, a] = am.outcomeScore.split(":").map((v) => parseInt(v.trim(), 10));
      targetH = isNaN(h) ? 1 : h;
      targetA = isNaN(a) ? 1 : a;
    } else {
      targetH = 1;
      targetA = 1;
    }
  } else if (am.outcome === "away") {
    if (am.outcomeScore && am.outcomeScore.includes(":")) {
      const [h, a] = am.outcomeScore.split(":").map((v) => parseInt(v.trim(), 10));
      targetH = isNaN(h) ? 0 : h;
      targetA = isNaN(a) ? 2 : a;
    } else {
      targetH = 0;
      targetA = 2;
    }
  }

  // 5. Match Status & Score Progression
  let status: MatchStatus = "SCHEDULED";
  let minute: number | undefined = undefined;
  let homeScore: number | undefined = undefined;
  let awayScore: number | undefined = undefined;

  if (am.status === "finished" || nowMs >= kickoffMs + matchDurationMs) {
    status = "FINISHED";
    minute = 90;
    homeScore = targetH;
    awayScore = targetA;
  } else if (am.status === "live" || (nowMs >= kickoffMs && nowMs < kickoffMs + matchDurationMs)) {
    status = "LIVE";
    const elapsedMinutes = Math.min(90, Math.max(1, Math.floor((nowMs - kickoffMs) / 60000)));
    minute = elapsedMinutes;

    // Simulate progressive goal scoring towards the specified outcome!
    if (elapsedMinutes < 25) {
      homeScore = targetH > 0 ? 1 : 0;
      awayScore = 0;
    } else if (elapsedMinutes < 65) {
      homeScore = targetH > 1 ? 1 : targetH;
      awayScore = targetA > 0 ? 1 : 0;
    } else {
      homeScore = targetH;
      awayScore = targetA;
    }
  } else {
    status = "SCHEDULED";
    minute = undefined;
    homeScore = undefined;
    awayScore = undefined;
  }

  // 6. Markets Generation
  const markets = generateAdminMatchMarkets(am.id, targetH, targetA);

  const match: Match = {
    id: am.id,
    code: `#${50000 + (hashString(am.id) % 49000)}`,
    leagueId: am.leagueId,
    sportId: "football",
    homeId,
    awayId,
    kickoff: kickoffIso,
    status,
    minute,
    homeScore,
    awayScore,
    venue: `${am.homeTeam} Arena`,
    hot: true,
    markets,
  };

  dynamicMatchesMap.set(match.id, match);
  return match;
}
