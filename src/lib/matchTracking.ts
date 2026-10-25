import type { Selection, HistoryEntry } from "@/store/betrix";
import type { Match } from "@/data/football";
import type { AdminMatch } from "@/data/adminMatches";
import { computeAdminMatchLiveState, getGoalSchedule } from "@/data/adminMatches";
import { GHANA_TZ } from "@/lib/ghana-time";

export interface GoalEvent {
  minute: number;
  team: "home" | "away";
  scorer?: string;
}

export interface LegLiveStatus {
  status: "UPCOMING" | "LIVE" | "WON" | "LOST";
  hasStarted: boolean;
  minute: number;
  half: "H1" | "H2" | "HT" | "FT" | "SCH";
  homeScore: number;
  awayScore: number;
  scoreText: string;
  liveOdds?: number | undefined;
  isWon: boolean;
  scheduledGoals: GoalEvent[];
  lastGoal?: GoalEvent | undefined;
  isGoalJustScored?: boolean | undefined;
}

/**
 * Deterministic hash for string IDs
 */
function stringHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Checks whether a selection outcome is winning given the final or current score.
 */
export function isWinningSelection(s: Selection, homeScore: number, awayScore: number): boolean {
  const opt = (s.optionLabel || "").trim();

  // Correct Score (e.g. "1:1", "2:2", "1:0")
  if (opt.includes(":")) {
    const [h, a] = opt.split(":").map(Number);
    if (!isNaN(h) && !isNaN(a)) {
      return homeScore === h && awayScore === a;
    }
  }

  // 1X2 / Match Result
  if (opt === "1" || opt.toLowerCase() === "home") {
    return homeScore > awayScore;
  }
  if (opt === "X" || opt.toLowerCase() === "draw") {
    return homeScore === awayScore;
  }
  if (opt === "2" || opt.toLowerCase() === "away") {
    return awayScore > homeScore;
  }

  // Total Goals / Over-Under
  if (/over\s*2\.5/i.test(opt)) {
    return homeScore + awayScore > 2;
  }
  if (/under\s*2\.5/i.test(opt)) {
    return homeScore + awayScore < 3;
  }

  return true;
}

/**
 * Calculates responsive live odds as the match minute advances.
 */
export function calculateLiveOdds(
  multiplier: number,
  minute: number,
  homeScore: number,
  awayScore: number,
  optionLabel: string,
): number {
  const isMatching = optionLabel.trim() === `${homeScore}:${awayScore}`;
  if (isMatching) {
    // Current score matches pick! Odds shorten as time runs down toward 90
    const decay = Math.max(0, (90 - minute) / 90);
    return Math.max(1.15, Math.round((1.05 + (multiplier - 1.05) * (0.25 + 0.35 * decay)) * 100) / 100);
  }
  // Score differs: live odds widen slightly or stay competitive
  return Math.max(1.25, Math.round(multiplier * 0.75 * 100) / 100);
}

/**
 * Scheduled goals for reference matches matching user screenshot:
 * - Mexico vs Peru (Final target: 1:1)
 *   Goals: 28' Mexico (1:0), 71' Peru (1:1)
 * - Club Aurora vs San Antonio Bulo Bulo (Final target: 2:2)
 *   Goals: 18' Aurora (1:0), 39' Bulo Bulo (1:1), 54' Aurora (2:1), 83' Bulo Bulo (2:2)
 */
export const MEXICO_PERU_GOALS: GoalEvent[] = [
  { minute: 28, team: "home", scorer: "Mexico" },
  { minute: 71, team: "away", scorer: "Peru" },
];

export const AURORA_BULO_GOALS: GoalEvent[] = [
  { minute: 18, team: "home", scorer: "Club Aurora" },
  { minute: 39, team: "away", scorer: "San Antonio Bulo Bulo" },
  { minute: 54, team: "home", scorer: "Club Aurora" },
  { minute: 83, team: "away", scorer: "San Antonio Bulo Bulo" },
];

/**
 * Deterministically generates goal timeline for any match from 0' to 90'.
 */
export function getMatchGoalSchedule(
  matchId: string,
  targetHome: number,
  targetAway: number,
  homeTeamName = "Home",
  awayTeamName = "Away",
): GoalEvent[] {
  const total = targetHome + targetAway;
  if (total <= 0) return [];

  const seed = stringHash(matchId || "match");
  const rawGoals = getGoalSchedule(matchId, targetHome, targetAway);

  return rawGoals.map((g) => ({
    minute: g.minute,
    team: g.team,
    scorer: g.team === "home" ? homeTeamName : awayTeamName,
  }));
}

/**
 * Calculates the initial cashout offer when a user stakes a bet.
 * Strictly lesser than the stake (e.g. 90% sportsbook cashout offering).
 */
export function getInitialCashoutValue(stake: number): number {
  if (!stake || stake <= 0) return 0;
  return Math.round(stake * 0.90 * 100) / 100;
}

/**
 * Evaluates the real-time live match state of an open bet selection leg.
 * Tracks matches continuously from 0' to 90' right from kickoff time,
 * with goal events occurring at their scheduled minutes.
 */
export function getLegLiveStatus(
  s: Selection,
  now = Date.now(),
  allMatches: Match[] = [],
  adminMatches: AdminMatch[] = [],
  simMinuteOverride?: number,
): LegLiveStatus {
  const title = (s.matchTitle || "").toLowerCase();

  // Reference matches from user media demo ticket:
  if (s.matchId === "ft-aur-bul") {
    return {
      status: "WON",
      hasStarted: true,
      minute: 90,
      half: "FT",
      homeScore: 2,
      awayScore: 2,
      scoreText: "FT | 2:2",
      isWon: true,
      scheduledGoals: AURORA_BULO_GOALS,
    };
  }

  if (s.matchId === "live-mex-per") {
    return {
      status: "LIVE",
      hasStarted: true,
      minute: 90,
      half: "H2",
      homeScore: 1,
      awayScore: 1,
      scoreText: "90' H2 | 1:1",
      liveOdds: 5.14,
      isWon: false,
      scheduledGoals: MEXICO_PERU_GOALS,
    };
  }

  // 3. Check matching adminMatch if present
  const am = adminMatches.find(
    (m) =>
      m.id === s.matchId ||
      `${m.homeTeam} vs ${m.awayTeam}`.toLowerCase() === title,
  );

  if (am) {
    const liveState = computeAdminMatchLiveState(am, now);
    const goals = getMatchGoalSchedule(
      am.id,
      liveState.targetHome,
      liveState.targetAway,
      am.homeTeam,
      am.awayTeam,
    );

    // If simulated minute override is provided
    let min = typeof simMinuteOverride === "number" ? Math.max(0, Math.min(90, simMinuteOverride)) : liveState.minute;

    if (liveState.status === "FINISHED" || (typeof simMinuteOverride === "number" && simMinuteOverride >= 90)) {
      const h = liveState.homeScore ?? liveState.targetHome;
      const a = liveState.awayScore ?? liveState.targetAway;
      const won = isWinningSelection(s, h, a);
      return {
        status: won ? "WON" : "LOST",
        hasStarted: true,
        minute: 90,
        half: "FT",
        homeScore: h,
        awayScore: a,
        scoreText: `FT | ${h}:${a}`,
        isWon: won,
        scheduledGoals: goals,
      };
    }

    if (liveState.status === "LIVE" || (typeof simMinuteOverride === "number" && simMinuteOverride > 0)) {
      const activeMin = min ?? 1;
      let h = 0;
      let a = 0;
      let lastG: GoalEvent | undefined;
      for (const g of goals) {
        if (g.minute <= activeMin) {
          if (g.team === "home") h++;
          else a++;
          lastG = g;
        }
      }

      const half = activeMin <= 45 ? "H1" : "H2";
      const liveOdds = calculateLiveOdds(s.multiplier, activeMin, h, a, s.optionLabel);
      return {
        status: "LIVE",
        hasStarted: true,
        minute: activeMin,
        half,
        homeScore: h,
        awayScore: a,
        scoreText: `${activeMin}' ${half} | ${h}:${a}`,
        liveOdds,
        isWon: false,
        scheduledGoals: goals,
        lastGoal: lastG,
        isGoalJustScored: lastG ? lastG.minute === activeMin : false,
      };
    }

    return {
      status: "UPCOMING",
      hasStarted: false,
      minute: 0,
      half: "SCH",
      homeScore: 0,
      awayScore: 0,
      scoreText: s.kickoffTime || "Scheduled",
      isWon: false,
      scheduledGoals: goals,
    };
  }

  // 2. Identify Target Goals for known or catalog matches
  let goals: GoalEvent[] = [];
  let defaultHomeScore = 1;
  let defaultAwayScore = 1;

  if (title.includes("aurora") && title.includes("bulo")) {
    goals = AURORA_BULO_GOALS;
    defaultHomeScore = 2;
    defaultAwayScore = 2;
  } else if (title.includes("mexico") && title.includes("peru")) {
    goals = MEXICO_PERU_GOALS;
    defaultHomeScore = 1;
    defaultAwayScore = 1;
  } else {
    const m = allMatches.find((match) => match.id === s.matchId);
    defaultHomeScore = m?.homeScore ?? 1;
    defaultAwayScore = m?.awayScore ?? 0;
    goals = getMatchGoalSchedule(
      s.matchId || title,
      defaultHomeScore,
      defaultAwayScore,
      title.split(" vs ")[0] || "Home",
      title.split(" vs ")[1] || "Away",
    );
  }

  // 3. Determine Minute & Kickoff
  const m = allMatches.find((match) => match.id === s.matchId);
  const kickoffStr = m?.kickoff || s.kickoffTime;
  const kickoffMs = kickoffStr ? new Date(kickoffStr).getTime() : NaN;

  // Check if simulated minute override is provided
  if (typeof simMinuteOverride === "number") {
    const min = Math.max(0, Math.min(90, Math.round(simMinuteOverride)));

    if (min === 0) {
      return {
        status: "UPCOMING",
        hasStarted: false,
        minute: 0,
        half: "SCH",
        homeScore: 0,
        awayScore: 0,
        scoreText: "Kickoff Soon",
        isWon: false,
        scheduledGoals: goals,
      };
    }

    if (min >= 90) {
      let h = 0;
      let a = 0;
      for (const g of goals) {
        if (g.minute <= 90) {
          if (g.team === "home") h++;
          else a++;
        }
      }
      const won = isWinningSelection(s, h, a);
      return {
        status: won ? "WON" : "LOST",
        hasStarted: true,
        minute: 90,
        half: "FT",
        homeScore: h,
        awayScore: a,
        scoreText: `FT | ${h}:${a}`,
        isWon: won,
        scheduledGoals: goals,
      };
    }

    // Live in-progress during simulation
    let h = 0;
    let a = 0;
    let lastG: GoalEvent | undefined;
    for (const g of goals) {
      if (g.minute <= min) {
        if (g.team === "home") h++;
        else a++;
        lastG = g;
      }
    }
    const half = min <= 45 ? "H1" : "H2";
    const liveOdds = calculateLiveOdds(s.multiplier, min, h, a, s.optionLabel);

    return {
      status: "LIVE",
      hasStarted: true,
      minute: min,
      half,
      homeScore: h,
      awayScore: a,
      scoreText: `${min}' ${half} | ${h}:${a}`,
      liveOdds,
      isWon: false,
      scheduledGoals: goals,
      lastGoal: lastG,
      isGoalJustScored: lastG ? lastG.minute === min : false,
    };
  }

  // Real-world clock calculation from kickoffMs
  if (!isNaN(kickoffMs)) {
    if (now < kickoffMs) {
      const formattedTime = new Date(kickoffMs).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: GHANA_TZ,
      });
      return {
        status: "UPCOMING",
        hasStarted: false,
        minute: 0,
        half: "SCH",
        homeScore: 0,
        awayScore: 0,
        scoreText: formattedTime ? `Kickoff ${formattedTime}` : "Upcoming",
        isWon: false,
        scheduledGoals: goals,
      };
    }

    // Match has kicked off at scheduled time!
    const elapsedMs = now - kickoffMs;
    const durationMs = 95 * 60 * 1000;

    if (elapsedMs >= durationMs || m?.status === "FINISHED") {
      let h = 0;
      let a = 0;
      for (const g of goals) {
        if (g.minute <= 90) {
          if (g.team === "home") h++;
          else a++;
        }
      }
      const won = isWinningSelection(s, h, a);
      return {
        status: won ? "WON" : "LOST",
        hasStarted: true,
        minute: 90,
        half: "FT",
        homeScore: h,
        awayScore: a,
        scoreText: `FT | ${h}:${a}`,
        isWon: won,
        scheduledGoals: goals,
      };
    }

    // Match is currently live! Tracks 1' to 90' as real time advances
    const min = Math.min(90, Math.max(1, Math.floor((elapsedMs / (90 * 60 * 1000)) * 90) + 1));
    const half = min <= 45 ? "H1" : "H2";

    let h = 0;
    let a = 0;
    let lastG: GoalEvent | undefined;
    for (const g of goals) {
      if (g.minute <= min) {
        if (g.team === "home") h++;
        else a++;
        lastG = g;
      }
    }
    const liveOdds = calculateLiveOdds(s.multiplier, min, h, a, s.optionLabel);

    return {
      status: "LIVE",
      hasStarted: true,
      minute: min,
      half,
      homeScore: h,
      awayScore: a,
      scoreText: `${min}' ${half} | ${h}:${a}`,
      liveOdds,
      isWon: false,
      scheduledGoals: goals,
      lastGoal: lastG,
      isGoalJustScored: lastG ? lastG.minute === min : false,
    };
  }

  // Default fallback for any upcoming match that has not started yet
  return {
    status: "UPCOMING",
    hasStarted: false,
    minute: 0,
    half: "SCH",
    homeScore: 0,
    awayScore: 0,
    scoreText: s.kickoffTime || "Scheduled",
    isWon: false,
    scheduledGoals: [],
  };
}

/**
 * Checks whether ANY match leg in a ticket has started or is currently in progress.
 * As required: cashout is locked when matches start!
 */
export function isAnyLegStarted(
  selections: Selection[] = [],
  now = Date.now(),
  allMatches: Match[] = [],
  adminMatches: AdminMatch[] = [],
  simMinuteOverride?: number,
): boolean {
  return selections.some(
    (s) => getLegLiveStatus(s, now, allMatches, adminMatches, simMinuteOverride).hasStarted,
  );
}

/**
 * Standard live-tracking ticket for Open Bets view matching the user's reference media.
 */
export const SAMPLE_LIVE_TICKET: HistoryEntry = {
  code: "BTX-LIVE-860",
  createdAt: new Date(Date.now() - 92 * 60 * 1000).toISOString(),
  stake: 1500,
  payout: 0,
  potWin: 126812.16,
  cashoutAvailable: false, // Locked because match is in progress!
  cashoutValue: 118664.47,
  status: "PENDING",
  matchTitle: "Mexico vs Peru + 1 more",
  selections: [
    {
      matchId: "live-mex-per",
      matchTitle: "Mexico vs Peru",
      optionId: "cs_1_1",
      optionLabel: "1:1",
      multiplier: 8.6,
      marketId: "cs",
      marketName: "Correct Score",
      kickoffTime: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    },
    {
      matchId: "ft-aur-bul",
      matchTitle: "Club Aurora vs San Antonio Bulo Bulo",
      optionId: "cs_2_2",
      optionLabel: "2:2",
      multiplier: 9.6,
      marketId: "cs",
      marketName: "Correct Score",
      kickoffTime: new Date(Date.now() - 130 * 60 * 1000).toISOString(),
    },
  ],
};
