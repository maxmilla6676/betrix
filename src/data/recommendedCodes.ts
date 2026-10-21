import type { Selection } from "@/store/betrix";

export interface RecommendedMatchItem {
  id: string;
  homeTeam: string;
  awayTeam: string;
  leagueName: string;
  leagueShort: string;
  leagueColor: string;
  pickLabel: string;
  pickMultiplier: number;
  marketName: string;
  kickoffDisplay: string;
  tag?: string;
}

export interface RecommendedCode {
  id: string;
  code: string;
  folds: number;
  oddsDisplay: string;
  sharesCount: number;
  promoBadge?: string;
  matches: RecommendedMatchItem[];
  selections: Selection[];
}

// Deprecated: community slips are now loaded dynamically from Supabase
export const recommendedFootballCodes: RecommendedCode[] = [];
