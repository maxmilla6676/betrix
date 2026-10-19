import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Home,
  Info,
  Star,
  SlidersHorizontal,
  Send,
  BarChart2,
  MessageSquare,
  PlayCircle,
  Share2,
  Zap,
  TrendingUp,
  Lock,
  Radio,
} from "lucide-react";
import { LiveBadge } from "@/components/match/LiveMatchCard";
import { TeamCrest } from "@/components/common/TeamCrest";
import { useBetrix } from "@/store/betrix";
import { dynamicTeams, dynamicLeagues } from "@/services/sportsApi";
import { cn } from "@/lib/utils";
import {
  formatDate,
  formatKickoff,
  leagueById,
  matchById,
  teamById,
  isMatchLocked,
  type Match,
  type Team,
  type League,
} from "@/data/football";
import { GHANA_TZ } from "@/lib/ghana-time";

export const Route = createFileRoute("/match/$matchId")({
  loader: ({ params }) => {
    const match = matchById(params.matchId);
    return { match: match || null, matchId: params.matchId };
  },
  head: ({ loaderData }) => {
    if (!loaderData?.match) {
      return { meta: [{ title: "Match Details — BETRIX" }] };
    }
    const { match } = loaderData;
    const home = teamById(match.homeId) || { name: "Home Team", short: "HOME" };
    const away = teamById(match.awayId) || { name: "Away Team", short: "AWAY" };
    const title = `${home.name} vs ${away.name} Details — BETRIX`;
    return {
      meta: [
        { title },
        { name: "description", content: `Live betting markets, odds, statistics and chat for ${home.name} vs ${away.name}.` },
      ],
    };
  },
  component: MatchDetailPage,
});

interface MarketItem {
  id: string;
  name: string;
  category: "Main" | "Goals" | "Halves" | "Handicap" | "Corners" | "Cards";
  info?: string;
  options: {
    id: string;
    label: string;
    multiplier: number;
    subLabel?: string;
  }[];
}

function generateMatchMarkets(home: Team, away: Team, seed: number): MarketItem[] {
  const hName = home?.name || "Home";
  const aName = away?.name || "Away";
  const hShort = home?.short || "HOME";
  const aShort = away?.short || "AWAY";

  // Base odds multipliers based on seed
  const base1 = 1.25 + (seed % 90) / 100;
  const baseX = 3.40 + (seed % 150) / 100;
  const base2 = 4.20 + (seed % 300) / 100;

  return [
    {
      id: "m_1x2",
      name: "1X2 (Match Result)",
      category: "Main",
      info: "Predict the final result at full-time (90 mins).",
      options: [
        { id: "opt_home", label: "Home", subLabel: hName, multiplier: Number(base1.toFixed(2)) },
        { id: "opt_draw", label: "Draw", subLabel: "Draw", multiplier: Number(baseX.toFixed(2)) },
        { id: "opt_away", label: "Away", subLabel: aName, multiplier: Number(base2.toFixed(2)) },
      ],
    },

    {
      id: "m_overunder_15",
      name: "Over/Under - Early Goals 10|total=1.5",
      category: "Goals",
      info: "Total goals scored in the match relative to 1.5.",
      options: [
        { id: "opt_over_15", label: "Over 1.5", multiplier: Number((1.22 + (seed % 20) / 100).toFixed(2)) },
        { id: "opt_under_15", label: "Under 1.5", multiplier: Number((3.80 + (seed % 50) / 100).toFixed(2)) },
      ],
    },
    {
      id: "m_double_chance",
      name: "Double Chance",
      category: "Main",
      info: "Cover two out of three possible outcomes.",
      options: [
        { id: "opt_dc_1x", label: `${hShort} or Draw`, multiplier: Number((1.05 + (seed % 10) / 100).toFixed(2)) },
        { id: "opt_dc_12", label: `${hShort} or ${aShort}`, multiplier: Number((1.12 + (seed % 10) / 100).toFixed(2)) },
        { id: "opt_dc_x2", label: `Draw or ${aShort}`, multiplier: Number((2.40 + (seed % 30) / 100).toFixed(2)) },
      ],
    },
    {
      id: "m_double_chance_1up",
      name: "Double Chance - 1UP",
      category: "Main",
      info: "Early payout if the team goes 1 goal up.",
      options: [
        { id: "opt_1up_1x", label: `${hShort} or Draw`, multiplier: Number((1.04 + (seed % 8) / 100).toFixed(2)) },
        { id: "opt_1up_12", label: `${hShort} or ${aShort}`, multiplier: 1.18 },
        { id: "opt_1up_x2", label: `Draw or ${aShort}`, multiplier: Number((2.55 + (seed % 40) / 100).toFixed(2)) },
      ],
    },
    {
      id: "m_first_goal",
      name: "1st Goal",
      category: "Goals",
      info: "Which team will score the first goal of the match?",
      options: [
        { id: "opt_fg_home", label: hName, multiplier: Number((1.25 + (seed % 15) / 100).toFixed(2)) },
        { id: "opt_fg_none", label: "None", multiplier: Number((14.50 + (seed % 200) / 100).toFixed(2)) },
        { id: "opt_fg_away", label: aName, multiplier: Number((4.70 + (seed % 80) / 100).toFixed(2)) },
      ],
    },
    {
      id: "m_handicap_01",
      name: "Handicap 0:1",
      category: "Handicap",
      info: "Away team starts with a 1 goal advantage.",
      options: [
        { id: "opt_h1_home", label: `${hShort} (-1)`, multiplier: Number((1.71 + (seed % 20) / 100).toFixed(2)) },
        { id: "opt_h1_draw", label: "Draw (0:1)", multiplier: Number((3.75 + (seed % 30) / 100).toFixed(2)) },
        { id: "opt_h1_away", label: `${aShort} (+1)`, multiplier: Number((4.10 + (seed % 50) / 100).toFixed(2)) },
      ],
    },
    {
      id: "m_handicap_02",
      name: "Handicap 0:2",
      category: "Handicap",
      info: "Away team starts with a 2 goal advantage.",
      options: [
        { id: "opt_h2_home", label: `${hShort} (-2)`, multiplier: Number((2.90 + (seed % 30) / 100).toFixed(2)) },
        { id: "opt_h2_draw", label: "Draw (0:2)", multiplier: Number((3.90 + (seed % 25) / 100).toFixed(2)) },
        { id: "opt_h2_away", label: `${aShort} (+2)`, multiplier: Number((2.05 + (seed % 20) / 100).toFixed(2)) },
      ],
    },
    {
      id: "m_correct_score",
      name: "Correct Score",
      category: "Main",
      info: "Predict the exact final score of the match.",
      options: [
        // Home wins
        { id: "cs-1:0", label: "1:0", multiplier: Number((6.50 + (seed % 80) / 100).toFixed(2)) },
        { id: "cs-2:0", label: "2:0", multiplier: Number((8.50 + (seed % 120) / 100).toFixed(2)) },
        { id: "cs-2:1", label: "2:1", multiplier: Number((9.00 + (seed % 150) / 100).toFixed(2)) },
        { id: "cs-3:0", label: "3:0", multiplier: Number((15.00 + (seed % 200) / 100).toFixed(2)) },
        { id: "cs-3:1", label: "3:1", multiplier: Number((19.00 + (seed % 250) / 100).toFixed(2)) },
        { id: "cs-3:2", label: "3:2", multiplier: Number((34.00 + (seed % 400) / 100).toFixed(2)) },
        { id: "cs-4:0", label: "4:0", multiplier: Number((41.00 + (seed % 500) / 100).toFixed(2)) },
        { id: "cs-4:1", label: "4:1", multiplier: Number((55.00 + (seed % 600) / 100).toFixed(2)) },
        // Draws
        { id: "cs-0:0", label: "0:0", multiplier: Number((7.00 + (seed % 90) / 100).toFixed(2)) },
        { id: "cs-1:1", label: "1:1", multiplier: Number((6.50 + (seed % 80) / 100).toFixed(2)) },
        { id: "cs-2:2", label: "2:2", multiplier: Number((18.00 + (seed % 220) / 100).toFixed(2)) },
        { id: "cs-3:3", label: "3:3", multiplier: Number((67.00 + (seed % 700) / 100).toFixed(2)) },
        // Away wins
        { id: "cs-0:1", label: "0:1", multiplier: Number((8.00 + (seed % 100) / 100).toFixed(2)) },
        { id: "cs-0:2", label: "0:2", multiplier: Number((11.00 + (seed % 160) / 100).toFixed(2)) },
        { id: "cs-1:2", label: "1:2", multiplier: Number((12.00 + (seed % 170) / 100).toFixed(2)) },
        { id: "cs-0:3", label: "0:3", multiplier: Number((21.00 + (seed % 280) / 100).toFixed(2)) },
        { id: "cs-1:3", label: "1:3", multiplier: Number((26.00 + (seed % 320) / 100).toFixed(2)) },
        { id: "cs-0:4", label: "0:4", multiplier: Number((51.00 + (seed % 550) / 100).toFixed(2)) },
      ],
    },

    {
      id: "m_btts",
      name: "Both Teams To Score (BTTS)",
      category: "Main",
      info: "Will both teams score at least 1 goal?",
      options: [
        { id: "opt_btts_yes", label: "Yes", multiplier: Number((1.75 + (seed % 15) / 100).toFixed(2)) },
        { id: "opt_btts_no", label: "No", multiplier: Number((2.05 + (seed % 20) / 100).toFixed(2)) },
      ],
    },
    {
      id: "m_overunder_25",
      name: "Total Goals - Over/Under 2.5",
      category: "Goals",
      info: "Total goals scored by both teams combined.",
      options: [
        { id: "opt_over_25", label: "Over 2.5", multiplier: Number((1.85 + (seed % 15) / 100).toFixed(2)) },
        { id: "opt_under_25", label: "Under 2.5", multiplier: Number((1.95 + (seed % 15) / 100).toFixed(2)) },
      ],
    },
    {
      id: "m_ht_ft",
      name: "Half Time / Full Time",
      category: "Halves",
      info: "Predict result at Half-Time AND Full-Time.",
      options: [
        { id: "opt_htft_11", label: `${hShort}/${hShort}`, multiplier: Number((2.10 + (seed % 20) / 100).toFixed(2)) },
        { id: "opt_htft_x1", label: `Draw/${hShort}`, multiplier: Number((4.50 + (seed % 40) / 100).toFixed(2)) },
        { id: "opt_htft_22", label: `${aShort}/${aShort}`, multiplier: Number((7.50 + (seed % 90) / 100).toFixed(2)) },
      ],
    },
    {
      id: "m_corners_ou",
      name: "Total Corners Over/Under 9.5",
      category: "Corners",
      info: "Total corner kicks taken by both teams.",
      options: [
        { id: "opt_corn_over", label: "Over 9.5", multiplier: 1.80 },
        { id: "opt_corn_under", label: "Under 9.5", multiplier: 1.95 },
      ],
    },
    {
      id: "m_yellow_cards",
      name: "Total Yellow Cards Over/Under 3.5",
      category: "Cards",
      info: "Total booking cards issued during 90 minutes.",
      options: [
        { id: "opt_card_over", label: "Over 3.5", multiplier: 1.70 },
        { id: "opt_card_under", label: "Under 3.5", multiplier: 2.10 },
      ],
    },
  ];
}

function MatchDetailPage() {
  const { match: loaderMatch, matchId } = Route.useLoaderData();
  const navigate = useNavigate();
  const { toggleSelection, isSelected, slip, allMatches } = useBetrix();

  const match = (allMatches.find((m) => m.id === matchId) || loaderMatch || matchById(matchId)) as Match | null;

  if (!match) {
    return (
      <div className="min-h-screen bg-[#000000] text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
        <Radio className="w-12 h-12 text-[#F5C400] animate-pulse" />
        <h1 className="text-xl font-extrabold">Match Not Found or Ended</h1>
        <p className="text-sm text-gray-400 max-w-md">
          This match is not currently live or has concluded. Please check the Live In-Play section for real-time fixtures.
        </p>
        <Link
          to="/live"
          className="inline-flex items-center px-5 py-2.5 rounded-lg bg-[#F5C400] text-black font-extrabold text-sm hover:opacity-90 transition-opacity"
        >
          View Live Matches
        </Link>
      </div>
    );
  }

  const home = teamById(match.homeId) || dynamicTeams.get(match.homeId) || {
    id: match.homeId,
    name: "Home Team",
    short: "HOM",
    country: "International",
    leagueId: match.leagueId,
    color: "#3B82F6",
    form: ["W", "D", "W", "L", "W"],
  };
  const away = teamById(match.awayId) || dynamicTeams.get(match.awayId) || {
    id: match.awayId,
    name: "Away Team",
    short: "AWY",
    country: "International",
    leagueId: match.leagueId,
    color: "#EF4444",
    form: ["L", "W", "D", "W", "W"],
  };

  const league = leagueById(match.leagueId) || dynamicLeagues.get(match.leagueId) || {
    id: match.leagueId,
    name: "Live Tournament",
    slug: "tournament",
    country: "International",
    short: "TOU",
    color: "#F5C400",
    sportId: "football",
    active: true,
  };

  const seed = useMemo(() => {
    let s = 0;
    for (let i = 0; i < match.id.length; i++) s += match.id.charCodeAt(i);
    return s;
  }, [match.id]);

  const allMarkets = useMemo(() => generateMatchMarkets(home, away, seed), [home, away, seed]);

  // Tab State: 'markets' | 'stats' | 'chat'
  const [activeMainTab, setActiveMainTab] = useState<"markets" | "stats" | "chat">("markets");

  // Category Filter State: 'All' | 'Main' | 'Goals' | 'Halves' | 'Handicap' | 'Corners' | 'Cards'
  const [activeCategory, setActiveCategory] = useState<string>("All");

  // Accordion collapsed state: marketId -> boolean
  const [collapsedMarkets, setCollapsedMarkets] = useState<Record<string, boolean>>({});

  // Favorite markets set: marketId -> boolean
  const [starredMarkets, setStarredMarkets] = useState<Record<string, boolean>>({});

  // Chat message state (real-time match discussion persisted per match)
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; user: string; text: string; time: string }>>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(`betrix_chat_${match.id}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [newMsg, setNewMsg] = useState("");

  const toggleCollapse = (marketId: string) => {
    setCollapsedMarkets((prev) => ({ ...prev, [marketId]: !prev[marketId] }));
  };

  const toggleStar = (marketId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarredMarkets((prev) => ({ ...prev, [marketId]: !prev[marketId] }));
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    const item = {
      id: String(Date.now()),
      user: "You",
      text: newMsg.trim(),
      time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: GHANA_TZ }),
    };
    setChatMessages((prev) => {
      const next = [...prev, item];
      try {
        localStorage.setItem(`betrix_chat_${match.id}`, JSON.stringify(next));
      } catch {}
      return next;
    });
    setNewMsg("");
  };

  // Filtered markets
  const filteredMarkets = useMemo(() => {
    let list = allMarkets;
    if (activeCategory !== "All") {
      list = list.filter((m) => m.category === activeCategory);
    }
    // Sort starred to top
    return [...list].sort((a, b) => {
      const starA = starredMarkets[a.id] ? 1 : 0;
      const starB = starredMarkets[b.id] ? 1 : 0;
      return starB - starA;
    });
  }, [allMarkets, activeCategory, starredMarkets]);

  const matchDate = useMemo(() => {
    const d = new Date(match.kickoff);
    const dayNum = d.toLocaleDateString("en-GB", { day: "2-digit", timeZone: GHANA_TZ });
    const monthNum = d.toLocaleDateString("en-GB", { month: "2-digit", timeZone: GHANA_TZ });
    const dayName = d.toLocaleDateString("en-US", { weekday: "long", timeZone: GHANA_TZ });
    const timeStr = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: GHANA_TZ });
    return { dateStr: `${dayNum}/${monthNum}`, dayName, timeStr };
  }, [match.kickoff]);

  const matchCode = match.code || `ID ${Math.floor(60000 + (seed % 30000))}`;

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-[#0e0e11] text-white pb-24 font-sans select-none">
      {/* Top Header Bar (Primestakers Style) */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-[#F5C400] px-4 py-3 text-black font-semibold shadow-md">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/10 transition-colors"
          aria-label="Back"
        >
          <ChevronLeft className="h-6 w-6 stroke-[2.5]" />
        </button>

        <h1 className="text-lg font-extrabold tracking-tight text-black">Details</h1>

        <button
          type="button"
          onClick={() => navigate({ to: "/" })}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/10 transition-colors"
          aria-label="Home"
        >
          <Home className="h-5 w-5" />
        </button>
      </header>

      {/* Main Match Body */}
      <main className="p-3 space-y-3">
        {/* League Breadcrumb */}
        <div className="text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-[#F5C400] hover:underline cursor-pointer">
            Football — {league.name}
          </span>
        </div>

        {/* Team Vs Team Scoreboard Box */}
        <div className="relative overflow-hidden rounded-xl bg-[#17171c] border border-[#26262e] p-4 shadow-lg">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            {/* Home Team */}
            <div className="flex flex-col items-center text-center space-y-2">
              <TeamCrest team={home} size="lg" className="h-16 w-16 drop-shadow-md" />
              <span className="text-xs font-extrabold leading-tight text-white line-clamp-2 max-w-[110px]">
                {home.name}
              </span>
            </div>

            {/* Kickoff / Live Score Info */}
            <div className="flex flex-col items-center justify-center text-center space-y-1">
              {match.status === "LIVE" ? (
                <>
                  <LiveBadge minute={match.minute} />
                  <div className="text-2xl font-black tabular-nums tracking-widest text-[#F5C400]">
                    {match.homeScore ?? 0} - {match.awayScore ?? 0}
                  </div>
                </>
              ) : match.status === "FINISHED" ? (
                <>
                  <span className="rounded bg-gray-700/60 px-2 py-0.5 text-[10px] font-black text-gray-300">
                    FULL TIME (FT)
                  </span>
                  <div className="text-2xl font-black tabular-nums tracking-widest text-white">
                    {match.homeScore ?? 0} - {match.awayScore ?? 0}
                  </div>
                </>
              ) : (
                <>
                  <span className="text-[11px] font-semibold text-gray-400">{matchDate.dateStr}</span>
                  <span className="text-[11px] font-semibold text-gray-400">{matchDate.dayName}</span>
                  <span className="text-lg font-black tracking-tight text-white">{matchDate.timeStr}</span>
                </>
              )}
            </div>

            {/* Away Team */}
            <div className="flex flex-col items-center text-center space-y-2">
              <TeamCrest team={away} size="lg" className="h-16 w-16 drop-shadow-md" />
              <span className="text-xs font-extrabold leading-tight text-white line-clamp-2 max-w-[110px]">
                {away.name}
              </span>
            </div>
          </div>

          {/* ID & Live Availability status */}
          <div className="mt-3 flex items-center justify-center gap-2 border-t border-[#26262e] pt-2 text-[11px] font-medium text-gray-400">
            <span>{matchCode}</span>
            <span className="text-gray-600">|</span>
            <span className="flex items-center gap-1 text-[#F5C400]">
              <PlayCircle className="h-3.5 w-3.5 fill-[#F5C400]/20 text-[#F5C400]" />
              {match.status === "FINISHED" ? "Match Ended" : match.status === "LIVE" ? "Live In-Play" : "Upcoming Scheduled"}
            </span>
          </div>

          {match.status === "FINISHED" ? (
            <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-gray-600/30 bg-gray-600/10 px-3 py-2 text-xs font-bold text-gray-300">
              <Lock className="h-4 w-4 shrink-0 text-gray-400" />
              <span>This match has finished. All betting markets and odds are locked.</span>
            </div>
          ) : isMatchLocked(match) ? (
            <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-300">
              <Lock className="h-4 w-4 shrink-0 text-amber-400" />
              <span>This match has kicked off. All betting markets and odds are locked until the game ends.</span>
            </div>
          ) : null}
        </div>

        {/* Main Segmented Tabs: Markets | Stats | Chat */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setActiveMainTab("markets")}
            className={cn(
              "flex-1 rounded-lg py-2.5 text-xs font-bold transition-all text-center",
              activeMainTab === "markets"
                ? "bg-white text-black shadow-md font-extrabold"
                : "bg-[#222228] text-gray-300 hover:bg-[#2c2c34]"
            )}
          >
            Markets
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab("stats")}
            className={cn(
              "flex-1 rounded-lg py-2.5 text-xs font-bold transition-all text-center",
              activeMainTab === "stats"
                ? "bg-white text-black shadow-md font-extrabold"
                : "bg-[#222228] text-gray-300 hover:bg-[#2c2c34]"
            )}
          >
            Stats
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab("chat")}
            className={cn(
              "flex-1 rounded-lg py-2.5 text-xs font-bold transition-all text-center",
              activeMainTab === "chat"
                ? "bg-white text-black shadow-md font-extrabold"
                : "bg-[#222228] text-gray-300 hover:bg-[#2c2c34]"
            )}
          >
            Chat
          </button>

          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#222228] text-gray-400 hover:text-white transition-colors"
            title="Match Info"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>

        {/* TAB 1: MARKETS VIEW */}
        {activeMainTab === "markets" && (
          <div className="space-y-3">
            {/* Category Filter Horizontal Scrollbar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar border-b border-[#222228]">
              <button
                type="button"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#1f1f25] text-gray-400 hover:text-white"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>

              <button
                type="button"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#1f1f25] text-gray-400 hover:text-[#F5C400]"
              >
                <Star className="h-4 w-4" />
              </button>

              {["All", "Main", "Goals", "Halves", "Handicap", "Corners", "Cards"].map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "relative shrink-0 px-3 py-1.5 text-xs font-bold transition-colors rounded-md",
                      isActive ? "text-white bg-[#1f1f25]" : "text-gray-400 hover:text-gray-200"
                    )}
                  >
                    {cat}
                    {isActive && (
                      <span className="absolute bottom-0 left-2 right-2 h-[2.5px] rounded-full bg-[#F5C400]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Markets Accordion List */}
            <div className="space-y-2.5">
              {filteredMarkets.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  No markets found for "{activeCategory}" category.
                </div>
              ) : (
                filteredMarkets.map((market) => {
                  const isCollapsed = collapsedMarkets[market.id];
                  const isStarred = starredMarkets[market.id];

                  const isLocked = isMatchLocked(match);
                  const isMatchFinished = match.status === "FINISHED";
                  if (market.id === "m_correct_score") {
                    return (
                      <CorrectScoreMarketCard
                        key={market.id}
                        matchId={match.id}
                        homeName={home.name}
                        awayName={away.name}
                        starred={isStarred}
                        isCollapsed={isCollapsed}
                        isMatchFinished={isLocked}
                        onToggleCollapse={() => toggleCollapse(market.id)}
                        onStarToggle={(e) => toggleStar(market.id, e)}
                        isSelected={isSelected}
                        toggleSelection={toggleSelection}
                      />
                    );
                  }

                  return (
                    <div
                      key={market.id}
                      className="overflow-hidden rounded-xl border border-[#25252c] bg-[#16161a] transition-all"
                    >
                      {/* Market Accordion Bar */}
                      <div
                        onClick={() => toggleCollapse(market.id)}
                        className="flex cursor-pointer items-center justify-between bg-[#1d1d23] px-3 py-2.5 text-xs font-bold text-gray-100 hover:bg-[#23232b] transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isCollapsed ? (
                            <ChevronDown className="h-4 w-4 text-[#F5C400] shrink-0" />
                          ) : (
                            <ChevronUp className="h-4 w-4 text-[#F5C400] shrink-0" />
                          )}
                          <span className="truncate text-xs font-extrabold tracking-tight">{market.name}</span>
                          {isMatchLocked ? (
                            <span className={cn(
                              "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold",
                              isMatchFinished
                                ? "bg-gray-800 text-gray-400"
                                : "bg-orange-900/60 text-orange-400"
                            )}>
                              <Lock className="h-2.5 w-2.5" />
                              {isMatchFinished ? "Locked" : "In-Play — Locked"}
                            </span>
                          ) : market.info ? (
                            <Info className="h-3 w-3 text-gray-500 hover:text-gray-300 shrink-0" title={market.info} />
                          ) : null}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => toggleStar(market.id, e)}
                          className="flex h-6 w-6 items-center justify-center text-gray-500 hover:text-[#F5C400] transition-colors"
                        >
                          <Star className={cn("h-3.5 w-3.5", isStarred && "fill-[#F5C400] text-[#F5C400]")} />
                        </button>
                      </div>

                      {/* Market Options Odds Grid */}
                      {!isCollapsed && (
                        <div className="p-2.5">
                          <div
                            className={cn(
                              "grid gap-2",
                              market.options.length === 3 ? "grid-cols-3" : "grid-cols-2"
                            )}
                          >
                            {market.options.map((opt) => {
                              const active = isSelected(match.id, market.id, opt.id);

                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  disabled={isLocked}
                                  onClick={() => {
                                    if (isLocked) {
                                      toast.error(
                                        match.status === "FINISHED"
                                          ? "This match has finished. Odds are locked."
                                          : "This match has already kicked off. Odds are locked until the game ends."
                                      );
                                      return;
                                    }
                                    toggleSelection({
                                      matchId: match.id,
                                      marketId: market.id,
                                      marketName: market.name,
                                      optionId: opt.id,
                                      optionLabel: opt.label,
                                      multiplier: opt.multiplier,
                                    });
                                  }}
                                  className={cn(
                                    "group relative flex flex-col justify-between rounded-lg border p-2.5 text-left transition-all duration-150",
                                    isLocked
                                      ? "border-[#202028] bg-[#141418] opacity-60 cursor-not-allowed"
                                      : active
                                      ? "border-[#F5C400] bg-[#292200] shadow-[0_0_12px_rgba(245,196,0,0.25)] active:scale-[0.97]"
                                      : "border-[#272730] bg-[#1a1a20] hover:border-[#383845] hover:bg-[#202028] active:scale-[0.97]"
                                  )}
                                >
                                  {/* Label on top */}
                                  <span className="truncate text-[11px] font-semibold text-gray-400 group-hover:text-gray-200">
                                    {opt.label}
                                  </span>

                                  {/* Multiplier / Odds value at bottom right */}
                                  <div className="mt-1 flex items-center justify-end">
                                    {isLocked ? (
                                      <span className={cn(
                                        "inline-flex items-center gap-1 text-xs font-bold",
                                        isMatchFinished ? "text-gray-500" : "text-orange-500/70"
                                      )}>
                                        <Lock className="h-3 w-3" />
                                        {isMatchFinished ? "FT" : "Live"}
                                      </span>
                                    ) : (
                                      <span
                                        className={cn(
                                          "text-sm font-black tabular-nums tracking-tight",
                                          active ? "text-[#F5C400]" : "text-[#F5C400]"
                                        )}
                                      >
                                        {opt.multiplier.toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: STATS VIEW */}
        {activeMainTab === "stats" && (
          <div className="space-y-3 rounded-xl border border-[#25252c] bg-[#16161a] p-4 text-xs">
            <h2 className="text-sm font-extrabold text-[#F5C400] flex items-center gap-2">
              <BarChart2 className="h-4 w-4" /> Live Match Statistics
            </h2>

            <div className="space-y-3 pt-2">
              <StatBar label="Possession %" home={52 + (seed % 10)} away={48 - (seed % 10)} homeName={home.short} awayName={away.short} />
              <StatBar label="Total Shots" home={11 + (seed % 6)} away={8 + (seed % 4)} homeName={home.short} awayName={away.short} />
              <StatBar label="Shots on Target" home={5 + (seed % 3)} away={3 + (seed % 2)} homeName={home.short} awayName={away.short} />
              <StatBar label="Corner Kicks" home={6 + (seed % 4)} away={4 + (seed % 3)} homeName={home.short} awayName={away.short} />
              <StatBar label="Fouls Committed" home={12 + (seed % 5)} away={14 - (seed % 4)} homeName={home.short} awayName={away.short} />
              <StatBar label="Yellow Cards" home={2} away={1} homeName={home.short} awayName={away.short} />
            </div>
          </div>
        )}

        {/* TAB 3: LIVE CHAT VIEW */}
        {activeMainTab === "chat" && (
          <div className="flex flex-col h-[400px] rounded-xl border border-[#25252c] bg-[#16161a] p-3 text-xs">
            <div className="flex items-center gap-2 border-b border-[#25252c] pb-2 text-sm font-extrabold text-[#F5C400]">
              <MessageSquare className="h-4 w-4" /> Fan Match Chat
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 py-3 pr-1">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-gray-500">
                  <MessageSquare className="h-8 w-8 mb-2 opacity-30 text-[#F5C400]" />
                  <p className="text-xs font-semibold text-gray-400">No chat messages yet</p>
                  <p className="text-[11px] text-gray-500 mt-1">Be the first to share your live prediction and match thoughts below.</p>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div key={msg.id} className="rounded-lg bg-[#1e1e26] p-2.5 space-y-0.5">
                    <div className="flex items-center justify-between text-[10px] text-gray-400">
                      <span className="font-bold text-[#F5C400]">{msg.user}</span>
                      <span>{msg.time}</span>
                    </div>
                    <p className="text-xs text-gray-100">{msg.text}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendChat} className="flex gap-2 pt-2 border-t border-[#25252c]">
              <input
                type="text"
                placeholder="Share your prediction or comment..."
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                className="flex-1 rounded-lg bg-[#22222b] px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#F5C400]"
              />
              <button
                type="submit"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F5C400] text-black hover:bg-[#e0b300] font-bold"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Floating Betslip Circle Indicator (Primestakers Style) */}
      {slip.length > 0 && (
        <div className="fixed bottom-16 right-4 z-50 animate-bounce">
          <button
            type="button"
            onClick={() => {
              // Open slip modal or scroll to slip
              const el = document.getElementById("betslip-trigger");
              if (el) el.click();
            }}
            className="flex flex-col items-center justify-center h-14 w-14 rounded-full bg-[#F5C400] text-black font-black shadow-[0_4px_20px_rgba(245,196,0,0.5)] border-2 border-white hover:scale-105 transition-transform"
          >
            <span className="text-lg leading-none">{slip.length}</span>
            <span className="text-[8px] font-extrabold uppercase tracking-tighter">BETSLIP</span>
          </button>
        </div>
      )}
    </div>
  );
}

function StatBar({
  label,
  home,
  away,
  homeName,
  awayName,
}: {
  label: string;
  home: number;
  away: number;
  homeName: string;
  awayName: string;
}) {
  const total = home + away || 1;
  const homePct = Math.round((home / total) * 100);
  const awayPct = 100 - homePct;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] font-semibold text-gray-300">
        <span>
          {homeName} <strong className="text-white ml-1">{home}</strong>
        </span>
        <span className="text-gray-500 uppercase tracking-wider text-[10px]">{label}</span>
        <span>
          <strong className="text-white mr-1">{away}</strong> {awayName}
        </span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-[#262630]">
        <div className="bg-[#F5C400] transition-all duration-500" style={{ width: `${homePct}%` }} />
        <div className="bg-[#3b82f6] transition-all duration-500" style={{ width: `${awayPct}%` }} />
      </div>
    </div>
  );
}

function CorrectScoreMarketCard({
  matchId,
  homeName,
  awayName,
  starred,
  isCollapsed,
  isMatchFinished = false,
  onToggleCollapse,
  onStarToggle,
  isSelected,
  toggleSelection,
}: {
  matchId: string;
  homeName: string;
  awayName: string;
  starred?: boolean;
  isCollapsed?: boolean;
  isMatchFinished?: boolean;
  onToggleCollapse: () => void;
  onStarToggle: (e: React.MouseEvent) => void;
  isSelected: (mId: string, mktId: string, optId: string) => boolean;
  toggleSelection: (sel: any) => void;
}) {
  const homeScores = [
    { label: "1:0", odds: 9.00 },
    { label: "2:0", odds: 100.00 },
    { label: "3:0", odds: 100.00 },
    { label: "4:0", odds: 100.00 },
    { label: "2:1", odds: 100.00 },
    { label: "3:1", odds: 100.00 },
    { label: "4:1", odds: 100.00 },
    { label: "3:2", odds: 100.00 },
    { label: "4:2", odds: 100.00 },
    { label: "4:3", odds: 100.00 },
  ];

  const drawScores = [
    { label: "0:0", odds: 1.07 },
    { label: "1:1", odds: 50.00 },
    { label: "2:2", odds: 100.00 },
    { label: "3:3", odds: 100.00 },
    { label: "4:4", odds: 0 },
  ];

  const awayScores = [
    { label: "0:1", odds: 2.90 },
    { label: "0:2", odds: 27.00 },
    { label: "0:3", odds: 100.00 },
    { label: "0:4", odds: 100.00 },
    { label: "1:2", odds: 100.00 },
    { label: "1:3", odds: 100.00 },
    { label: "1:4", odds: 100.00 },
    { label: "2:3", odds: 100.00 },
    { label: "2:4", odds: 100.00 },
    { label: "3:4", odds: 100.00 },
  ];

  const maxRows = Math.max(homeScores.length, drawScores.length, awayScores.length);

  return (
    <div className="overflow-hidden rounded-xl border border-[#25252c] bg-[#12141a] transition-all">
      {/* Accordion Header Bar */}
      <div
        onClick={onToggleCollapse}
        className="flex cursor-pointer items-center justify-between bg-[#1d1d23] px-3 py-2.5 text-xs font-bold text-gray-100 hover:bg-[#23232b] transition-colors"
      >
        <div className="flex items-center gap-2">
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4 text-[#F5C400]" />
          ) : (
            <ChevronUp className="h-4 w-4 text-[#F5C400]" />
          )}
          <span className="font-extrabold text-sm text-white">Correct Score</span>
          <Info className="h-3.5 w-3.5 text-gray-500 hover:text-gray-300" title="Predict exact final score" />
        </div>
        <button type="button" onClick={onStarToggle} className="text-gray-500 hover:text-[#F5C400]">
          <Star className={cn("h-4 w-4", starred && "fill-[#F5C400] text-[#F5C400]")} />
        </button>
      </div>

      {!isCollapsed && (
        <div className="p-3 space-y-2 bg-[#0c0e14]">
          {/* 3 Column Team Headers */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold text-gray-400 pb-1">
            <span className="truncate px-1 text-gray-300">{homeName}</span>
            <span className="text-gray-300">Draw</span>
            <span className="truncate px-1 text-gray-300">{awayName}</span>
          </div>

          {/* 3 Column Grid Rows */}
          <div className="space-y-1.5">
            {Array.from({ length: maxRows }).map((_, idx) => {
              const hItem = homeScores[idx];
              const dItem = drawScores[idx];
              const aItem = awayScores[idx];

              return (
                <div key={idx} className="grid grid-cols-3 gap-2">
                  {/* Home Column */}
                  {hItem ? (
                    <ScoreButton
                      matchId={matchId}
                      score={hItem.label}
                      odds={hItem.odds}
                      isSelected={isSelected}
                      toggleSelection={toggleSelection}
                      disabled={isMatchFinished}
                    />
                  ) : (
                    <div />
                  )}

                  {/* Draw Column */}
                  {dItem ? (
                    <ScoreButton
                      matchId={matchId}
                      score={dItem.label}
                      odds={dItem.odds}
                      isSelected={isSelected}
                      toggleSelection={toggleSelection}
                      disabled={isMatchFinished}
                    />
                  ) : (
                    <div />
                  )}

                  {/* Away Column */}
                  {aItem ? (
                    <ScoreButton
                      matchId={matchId}
                      score={aItem.label}
                      odds={aItem.odds}
                      isSelected={isSelected}
                      toggleSelection={toggleSelection}
                      disabled={isMatchFinished}
                    />
                  ) : (
                    <div />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreButton({
  matchId,
  score,
  odds,
  isSelected,
  toggleSelection,
  disabled = false,
}: {
  matchId: string;
  score: string;
  odds: number;
  isSelected: (mId: string, mktId: string, optId: string) => boolean;
  toggleSelection: (sel: any) => void;
  disabled?: boolean;
}) {
  const optId = `cs-${score}`;
  const active = isSelected(matchId, "m_correct_score", optId);
  const isButtonDisabled = disabled || odds <= 0;

  return (
    <button
      type="button"
      disabled={isButtonDisabled}
      onClick={() => {
        if (isButtonDisabled) return;
        toggleSelection({
          matchId,
          marketId: "m_correct_score",
          marketName: "Correct Score",
          optionId: optId,
          optionLabel: score,
          multiplier: odds,
        });
      }}
      className={cn(
        "h-10 px-2.5 rounded-lg border flex items-center justify-between text-xs font-bold transition-all",
        isButtonDisabled
          ? "bg-[#141720]/60 border-[#1f2638]/60 text-gray-600 cursor-not-allowed"
          : active
          ? "bg-[#F5C400] border-[#F5C400] text-black font-black shadow-md shadow-[#F5C400]/20 active:scale-95"
          : "bg-[#11141c] border-[#252c3d] text-gray-200 hover:border-[#F5C400]/60 hover:bg-[#181d29] active:scale-95"
      )}
    >
      <span className={cn("font-bold text-xs", active ? "text-black font-black" : "text-gray-300")}>
        {score}
      </span>
      {disabled ? (
        <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-500">
          <Lock className="h-2.5 w-2.5" /> Locked
        </span>
      ) : (
        <span className={cn("font-black text-xs font-mono", active ? "text-black" : "text-[#F5C400]")}>
          {odds <= 0 ? "—" : odds.toFixed(2)}
        </span>
      )}
    </button>
  );
}
