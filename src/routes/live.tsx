import React, { useState, useMemo, useEffect, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Lock,
  Radio,
  Clock,
  Calendar,
} from "lucide-react";
import { useBetrix, type Selection } from "@/store/betrix";
import { teamById, leagueById, dayBucket, isMatchLocked, type Match } from "@/data/football";
import { cn } from "@/lib/utils";
import { formatTimeGhana, formatClockGhana, GHANA_TZ } from "@/lib/ghana-time";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Live In-Play Sports — BETRIX" },
      { name: "description", content: "Real-time live in-play sports betting, scores, and odds updates." },
    ],
  }),
  component: LivePage,
});

// Expanded Mock Live Matches across different sports to fulfill Tennis, Football, Basketball, etc.
// Helper to build a logo URL for well-known teams via ESPN CDN
function espnLogo(id: string) {
  return `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png`;
}
function espnLogoNba(id: string) {
  return `https://a.espncdn.com/i/teamlogos/nba/500/${id}.png`;
}

const extraLiveSportsMatches: any[] = [];

const sportsDefinitions = [
  { id: "football", name: "Football", emoji: "⚽" },
  { id: "basketball", name: "Basketball", emoji: "🏀" },
  { id: "tennis", name: "Tennis", emoji: "🎾" },
  { id: "baseball", name: "Baseball", emoji: "⚾" },
];

const marketTypes = ["1X2", "Over/Under", "BTTS", "Double Chance"];

function LivePage() {
  const navigate = useNavigate();
  const { isSelected, toggleSelection, allMatches } = useBetrix();

  const [activeSport, setActiveSport] = useState("football");
  const [activeMarket, setActiveMarket] = useState("1X2");
  const [collapsedLeagues, setCollapsedLeagues] = useState<Record<string, boolean>>({});
  const [sortBy, setSortBy] = useState<"Leagues" | "Time">("Leagues");
  const [collapseAll, setCollapseAll] = useState(false);

  // ── Ghana GMT live clock ────────────────────────────────────────────────────
  const [ghanaClock, setGhanaClock] = useState(() => formatClockGhana(new Date()));
  useEffect(() => {
    const t = setInterval(() => setGhanaClock(formatClockGhana(new Date())), 1000);
    return () => clearInterval(t);
  }, []);
  const ghanaDateLabel = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", timeZone: GHANA_TZ,
    });
  }, []);

  // ── Live matches from store (strictly deduplicated by ID and team names) ─────
  const storeLive = useMemo(() => {
    const seen = new Set<string>();
    const seenTeams = new Set<string>();
    const out: Array<{
      id: string;
      sportId: string;
      leagueName: string;
      period: string;
      homeName: string;
      homeLogo?: string;
      homeColor: string;
      awayName: string;
      awayLogo?: string;
      awayColor: string;
      homeScore: number;
      awayScore: number;
      markets: any[];
    }> = [];

    for (const m of allMatches) {
      if (m.status !== "LIVE") continue;
      if (seen.has(m.id)) continue;
      seen.add(m.id);

      const homeTeam = teamById(m.homeId);
      const awayTeam = teamById(m.awayId);
      const hClean = (homeTeam?.name || m.homeId).toLowerCase().replace(/[^a-z0-9]/g, "");
      const aClean = (awayTeam?.name || m.awayId).toLowerCase().replace(/[^a-z0-9]/g, "");
      const pairKey = `${hClean}__vs__${aClean}`;
      if (seenTeams.has(pairKey)) continue;
      seenTeams.add(pairKey);

      const lg = leagueById(m.leagueId)?.name || "Live Tournament";
      out.push({
        id: m.id,
        sportId: m.sportId || "football",
        leagueName: lg,
        period: `${m.minute || 45}'`,
        homeName: homeTeam?.name || "Home",
        homeLogo: homeTeam?.logo,
        homeColor: homeTeam?.color || "#3B82F6",
        awayName: awayTeam?.name || "Away",
        awayLogo: awayTeam?.logo,
        awayColor: awayTeam?.color || "#EF4444",
        homeScore: m.homeScore ?? 0,
        awayScore: m.awayScore ?? 0,
        markets: m.markets || [
          {
            id: "1x2",
            name: "1X2",
            options: [
              { id: `${m.id}-1`, label: "1", multiplier: 2.10, locked: false },
              { id: `${m.id}-x`, label: "X", multiplier: 3.20, locked: false },
              { id: `${m.id}-2`, label: "2", multiplier: 3.40, locked: false },
            ],
          },
        ],
      });
    }

    return out;
  }, [allMatches]);

  const sportsList = useMemo(() => {
    return sportsDefinitions.map((sp) => ({
      ...sp,
      count: storeLive.filter((m) => m.sportId === sp.id).length,
    }));
  }, [storeLive]);

  // ── Upcoming: SCHEDULED matches for Today & Tomorrow (Ghana time) ───────────
  const upcomingToday = useMemo(() =>
    allMatches.filter((m) => m.status === "SCHEDULED" && dayBucket(m.kickoff) === "Today")
      .sort((a, b) => a.kickoff.localeCompare(b.kickoff)),
    [allMatches]
  );
  const upcomingTomorrow = useMemo(() =>
    allMatches.filter((m) => m.status === "SCHEDULED" && dayBucket(m.kickoff) === "Tomorrow")
      .sort((a, b) => a.kickoff.localeCompare(b.kickoff)),
    [allMatches]
  );

  const [upcomingCollapsed, setUpcomingCollapsed] = useState(false);

  const currentSportMatches = useMemo(() => {
    const combined = [...extraLiveSportsMatches, ...storeLive];
    return combined
      .filter((m) => m.sportId === activeSport)
      .sort((a, b) => (b.period ? parseInt(b.period) : 0) - (a.period ? parseInt(a.period) : 0));
  }, [activeSport, storeLive]);

  // Group current matches by league
  const groupedLeagues = useMemo(() => {
    const groups: Record<string, typeof currentSportMatches> = {};
    for (const m of currentSportMatches) {
      if (!groups[m.leagueName]) {
        groups[m.leagueName] = [];
      }
      groups[m.leagueName]!.push(m);
    }
    return groups;
  }, [currentSportMatches]);

  const toggleLeagueCollapse = (leagueName: string) => {
    setCollapsedLeagues((prev) => ({
      ...prev,
      [leagueName]: !prev[leagueName],
    }));
  };

  const handleToggleCollapseAll = () => {
    const next = !collapseAll;
    setCollapseAll(next);
    const newCollapsed: Record<string, boolean> = {};
    Object.keys(groupedLeagues).forEach((lg) => {
      newCollapsed[lg] = next;
    });
    setCollapsedLeagues(newCollapsed);
  };

  const totalLiveCount = storeLive.length + extraLiveSportsMatches.length;

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col pb-20 select-none">
      {/* 1. Yellow Live Header Bar — Ghana GMT clock */}
      <div className="bg-[#F5C400] text-black px-4 py-2 flex items-center justify-between shadow-md">
        <button
          onClick={() => navigate({ to: "/" })}
          className="flex items-center text-black hover:opacity-75 transition-opacity"
        >
          <ChevronLeft className="w-6 h-6 stroke-[3]" />
        </button>

        <div className="flex flex-col items-center">
          <div className="flex items-center space-x-2 font-black text-base tracking-tight">
            <span className="w-2.5 h-2.5 rounded-full bg-white border-2 border-black inline-block animate-pulse" />
            <span>Live</span>
            <span className="font-semibold text-black/80">({totalLiveCount})</span>
          </div>
          {/* Ghana GMT clock */}
          <div className="flex items-center gap-1 text-[10px] font-bold text-black/70 mt-0.5">
            <Clock className="w-3 h-3" />
            <span>{ghanaClock} GMT · {ghanaDateLabel}</span>
          </div>
        </div>

        <button
          onClick={() => navigate({ to: "/matches" })}
          className="font-black text-xs uppercase text-black hover:underline"
        >
          Schedule
        </button>
      </div>


      {/* 2. Sport Icons Horizontal Bar */}
      <div className="bg-[#0c0f16] border-b border-[#181d2a] px-2 py-3 overflow-x-auto no-scrollbar">
        <div className="flex items-center space-x-3 min-w-max px-2">
          {sportsList.map((sp) => {
            const isActive = activeSport === sp.id;
            return (
              <button
                key={sp.id}
                onClick={() => setActiveSport(sp.id)}
                className="flex flex-col items-center group relative px-2 transition-transform active:scale-95"
              >
                {/* Badge Count above icon */}
                <span
                  className={cn(
                    "text-[10px] font-black leading-none mb-1",
                    isActive ? "text-[#F5C400]" : "text-gray-400 group-hover:text-gray-200"
                  )}
                >
                  {sp.count}
                </span>

                {/* Circular Sport Icon */}
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm border transition-all",
                    isActive
                      ? "bg-[#181e2b] border-[#F5C400] text-[#F5C400] shadow-[#F5C400]/20"
                      : "bg-[#121622] border-[#22293a] text-gray-400 group-hover:border-gray-500"
                  )}
                >
                  {sp.emoji}
                </div>

                {/* Sport Name */}
                <span
                  className={cn(
                    "text-[11px] font-bold mt-1.5 transition-colors",
                    isActive ? "text-[#F5C400]" : "text-gray-400 group-hover:text-gray-200"
                  )}
                >
                  {sp.name}
                </span>

                {/* Active Underline Bar */}
                {isActive && (
                  <div className="absolute -bottom-3 left-0 right-0 h-0.5 bg-[#F5C400] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Market Types Selector Bar */}
      <div className="bg-[#000000] border-b border-[#181d26] px-4 pt-3 flex items-center space-x-6 text-xs font-bold uppercase tracking-wider overflow-x-auto no-scrollbar">
        {marketTypes.map((mkt) => {
          const isActive = activeMarket === mkt;
          return (
            <button
              key={mkt}
              onClick={() => setActiveMarket(mkt)}
              className={cn(
                "pb-2.5 transition-colors relative whitespace-nowrap",
                isActive ? "text-[#F5C400] font-black" : "text-gray-400 hover:text-gray-200"
              )}
            >
              {mkt}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F5C400]" />
              )}
            </button>
          );
        })}
      </div>

      {/* 4. Sub-header Actions (Collapse All & Sort Dropdown) */}
      <div className="bg-[#000000] px-4 py-2 flex items-center justify-between text-xs border-b border-[#141822]">
        <button
          onClick={handleToggleCollapseAll}
          className="flex items-center space-x-1.5 text-[#F5C400] font-bold hover:opacity-80 transition-opacity"
        >
          {collapseAll ? (
            <ChevronUp className="w-4 h-4 stroke-[3]" />
          ) : (
            <ChevronDown className="w-4 h-4 stroke-[3]" />
          )}
          <span>{collapseAll ? "Expand All" : "Collapse All"}</span>
        </button>

        <div className="flex items-center space-x-1 text-gray-400">
          <span className="text-[11px]">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#121622] text-gray-200 text-xs font-bold rounded px-2 py-0.5 border border-[#22293a] focus:outline-none focus:border-[#F5C400]"
          >
            <option value="Leagues">Leagues</option>
            <option value="Time">Time</option>
          </select>
        </div>
      </div>

      {/* 5. Column Headers Row (1 X 2) */}
      <div className="bg-[#080b11] px-4 py-1.5 flex items-center justify-end text-[11px] font-mono font-bold text-gray-400 border-b border-[#121622]">
        <div className="grid grid-cols-3 gap-2 w-48 text-center pr-1">
          <span>1</span>
          <span>X</span>
          <span>2</span>
        </div>
      </div>

      {/* 6. Collapsible Leagues List */}
      <div className="flex-1 divide-y divide-[#141824]">
        {Object.keys(groupedLeagues).length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-2">
            <Radio className="w-8 h-8 mx-auto text-gray-600 animate-pulse" />
            <p className="font-bold text-sm text-gray-400">No live matches right now</p>
            <p className="text-xs">Check back soon for upcoming live fixtures in {activeSport}.</p>
          </div>
        ) : (
          Object.entries(groupedLeagues).map(([leagueName, matchesList]) => {
            const isCollapsed = collapsedLeagues[leagueName] ?? false;

            return (
              <div key={leagueName} className="bg-[#000000]">
                {/* League Header */}
                <button
                  onClick={() => toggleLeagueCollapse(leagueName)}
                  className="w-full bg-[#0a0d14] hover:bg-[#10141f] px-4 py-2.5 flex items-center justify-between text-left transition-colors border-b border-[#141926]"
                >
                  <div className="flex items-center space-x-2">
                    {isCollapsed ? (
                      <ChevronUp className="w-4 h-4 text-[#F5C400]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#F5C400]" />
                    )}
                    <span className="font-extrabold text-xs text-white tracking-wide">
                      {leagueName}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-gray-400 font-bold">
                    {matchesList.length}
                  </span>
                </button>

                {/* League Match Rows */}
                {!isCollapsed && (
                  <div className="divide-y divide-[#121622]">
                    {matchesList.map((m) => {
                      const market1X2 = m.markets?.find((mk) => mk.id === "1x2" || mk.name === "1X2") || m.markets?.[0];
                      const options = market1X2?.options || [];

                      return (
                        <div
                          key={m.id}
                          className="px-4 py-3 bg-[#000000] hover:bg-[#07090e] transition-colors flex items-center justify-between"
                        >
                          {/* Match Info & Teams */}
                          <div className="flex-1 pr-3 space-y-1">
                            {/* Live period indicator */}
                            <div className="flex items-center space-x-1.5 text-[10px] font-bold text-[#F5C400]">
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                              <span className="uppercase font-mono tracking-wider">{m.period}</span>
                            </div>

                            {/* Competitor 1 */}
                            <div className="flex items-center justify-between text-xs font-bold text-gray-100">
                              <div className="flex items-center gap-2 min-w-0">
                                {(m as any).homeLogo ? (
                                  <span className="inline-flex shrink-0 h-6 w-6 rounded-full border border-white/20 bg-white p-0.5 overflow-hidden shadow-sm">
                                    <img src={(m as any).homeLogo} alt={m.homeName} className="h-full w-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                  </span>
                                ) : (
                                  <span
                                    className="inline-flex shrink-0 h-6 w-6 rounded-full items-center justify-center text-[9px] font-black text-white border border-white/10"
                                    style={{ backgroundColor: (m as any).homeColor || "#3B82F6" }}
                                  >
                                    {m.homeName.substring(0, 2).toUpperCase()}
                                  </span>
                                )}
                                <span className="truncate max-w-[120px] sm:max-w-[170px]">{m.homeName}</span>
                              </div>
                              <span className="font-mono font-black text-white pl-2 shrink-0">{m.homeScore}</span>
                            </div>

                            {/* Competitor 2 */}
                            <div className="flex items-center justify-between text-xs font-bold text-gray-100">
                              <div className="flex items-center gap-2 min-w-0">
                                {(m as any).awayLogo ? (
                                  <span className="inline-flex shrink-0 h-6 w-6 rounded-full border border-white/20 bg-white p-0.5 overflow-hidden shadow-sm">
                                    <img src={(m as any).awayLogo} alt={m.awayName} className="h-full w-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                  </span>
                                ) : (
                                  <span
                                    className="inline-flex shrink-0 h-6 w-6 rounded-full items-center justify-center text-[9px] font-black text-white border border-white/10"
                                    style={{ backgroundColor: (m as any).awayColor || "#EF4444" }}
                                  >
                                    {m.awayName.substring(0, 2).toUpperCase()}
                                  </span>
                                )}
                                <span className="truncate max-w-[120px] sm:max-w-[170px]">{m.awayName}</span>
                              </div>
                              <span className="font-mono font-black text-white pl-2 shrink-0">{m.awayScore}</span>
                            </div>

                            {/* +2 markets link */}
                            <Link
                              to="/match/$matchId"
                              params={{ matchId: m.id }}
                              className="inline-block text-[10px] font-bold text-[#F5C400] hover:underline pt-0.5"
                            >
                              +2 markets &gt;
                            </Link>
                          </div>

                          {/* Odds Buttons Column (3 items for 1 X 2) */}
                          <div className="grid grid-cols-3 gap-1.5 w-48 shrink-0">
                            {[0, 1, 2].map((optIdx) => {
                              const opt = options[optIdx];
                              if (!opt) {
                                return (
                                  <div
                                    key={optIdx}
                                    className="h-12 bg-[#12151f] rounded-lg border border-[#1b202e] opacity-40"
                                  />
                                );
                              }

                              // Live in-play matches have started — odds are locked until the game ends
                              const isLocked = true;
                              const selectionPayload: Selection = {
                                matchId: m.id,
                                marketId: market1X2?.id || "1x2",
                                marketName: market1X2?.name || "1X2",
                                optionId: opt.id,
                                optionLabel: opt.label,
                                multiplier: opt.multiplier,
                              };

                              const active = isSelected(m.id, market1X2?.id || "1x2", opt.id);

                              return (
                                <button
                                  key={opt.id || optIdx}
                                  disabled={isLocked}
                                  title="Odds are locked while match is in-play"
                                  onClick={() => {
                                    toast.error("This match has kicked off. Odds are locked until the game ends.");
                                  }}
                                  className={cn(
                                    "h-12 rounded-lg flex flex-col items-center justify-center font-mono font-bold text-xs transition-all border",
                                    isLocked
                                      ? "bg-[#111520] border-[#1a2030] text-gray-600 cursor-not-allowed opacity-75"
                                      : active
                                      ? "bg-[#F5C400] border-[#F5C400] text-black shadow-md shadow-[#F5C400]/20 font-black scale-95"
                                      : "bg-[#121622] border-[#1f283d] text-white hover:border-[#F5C400]/50 hover:bg-[#182030]"
                                  )}
                                >
                                  <Lock className="w-3.5 h-3.5 text-gray-400" />
                                  <span className="text-[8px] font-black uppercase tracking-tight text-gray-500 mt-0.5">Locked</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── UPCOMING MATCHES SECTION ───────────────────────────────────────── */}
      <div className="border-t border-[#181d26]">
        {/* Section Header */}
        <button
          onClick={() => setUpcomingCollapsed(!upcomingCollapsed)}
          className="w-full bg-[#0a0e17] hover:bg-[#10141f] px-4 py-3 flex items-center justify-between border-b border-[#141926] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#F5C400]" />
            <span className="font-extrabold text-sm text-white tracking-wide">UPCOMING MATCHES</span>
            <span className="text-xs font-bold text-gray-400 ml-1">
              ({upcomingToday.length + upcomingTomorrow.length})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[#F5C400] font-mono">{ghanaClock} GMT</span>
            {upcomingCollapsed
              ? <ChevronDown className="w-4 h-4 text-[#F5C400]" />
              : <ChevronUp className="w-4 h-4 text-[#F5C400]" />
            }
          </div>
        </button>

        {!upcomingCollapsed && (
          <div className="divide-y divide-[#0f1420]">
            {/* ── TODAY ── */}
            {upcomingToday.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-4 py-2 bg-[#05080f]">
                  <span className="text-[11px] font-black text-[#F5C400] uppercase tracking-wider">TODAY</span>
                  <span className="text-[10px] font-bold text-gray-500">{upcomingToday.length} fixtures</span>
                </div>
                <div className="divide-y divide-[#0d1220]">
                  {upcomingToday.map((m) => {
                    const home = teamById(m.homeId);
                    const away = teamById(m.awayId);
                    const league = leagueById(m.leagueId);
                    const kickoffStr = formatTimeGhana(m.kickoff);
                    const market = m.markets.find((mk) => mk.id === "1x2") || m.markets[0];
                    const opts = market?.options || [];
                    return (
                      <div key={m.id} className="px-4 py-3 bg-[#000000] hover:bg-[#07090e] transition-colors flex items-center justify-between gap-3">
                        <Link to="/match/$matchId" params={{ matchId: m.id }} className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 text-[10px] text-gray-500 font-semibold">
                            <Clock className="w-3 h-3 text-[#F5C400]" />
                            <span className="font-extrabold text-[#F5C400]">{kickoffStr}</span>
                            <span className="truncate inline-flex items-center gap-1">
                              {league?.logo ? <img src={league.logo} alt="" className="h-3 w-3 rounded-full object-cover shrink-0" /> : null}
                              {league?.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-200 truncate">
                            {home?.logo && <img src={home.logo} alt="" className="h-3.5 w-3.5 rounded-full object-cover shrink-0 bg-white/10" />}
                            <span className="truncate">{home?.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-200 truncate">
                            {away?.logo && <img src={away.logo} alt="" className="h-3.5 w-3.5 rounded-full object-cover shrink-0 bg-white/10" />}
                            <span className="truncate">{away?.name}</span>
                          </div>
                        </Link>
                        <div className="grid grid-cols-3 gap-1 w-40 shrink-0">
                          {[0, 1, 2].map((i) => {
                            const opt = opts[i];
                            if (!opt) return <div key={i} className="h-10 bg-[#0d1220] rounded border border-[#141824] opacity-30" />;
                            const active = isSelected(m.id, market?.id || "1x2", opt.id);
                            const isLocked = isMatchLocked(m);
                            return (
                              <button
                                key={opt.id}
                                disabled={isLocked}
                                onClick={() => {
                                  if (isLocked) {
                                    toast.error(m.status === "FINISHED" ? "This match has ended. Odds are locked." : "This match has kicked off. Odds are locked until the game ends.");
                                    return;
                                  }
                                  toggleSelection({ matchId: m.id, marketId: market?.id || "1x2", marketName: market?.name || "1X2", optionId: opt.id, optionLabel: opt.label, multiplier: opt.multiplier });
                                }}
                                className={cn(
                                  "h-10 rounded flex flex-col items-center justify-center font-mono text-[11px] font-bold border transition-all",
                                  isLocked
                                    ? "bg-[#0b0e14] border-[#141824] text-gray-600 cursor-not-allowed opacity-50"
                                    : active
                                    ? "bg-[#F5C400] border-[#F5C400] text-black font-black"
                                    : "bg-[#111520] border-[#1b2030] text-white hover:border-[#F5C400]/40"
                                )}
                              >
                                {isLocked ? (
                                  <Lock className="w-3 h-3 text-gray-500" />
                                ) : (
                                  <>
                                    <span className="text-[8px] font-bold opacity-60">{opt.label}</span>
                                    <span>{opt.multiplier.toFixed(2)}</span>
                                  </>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── TOMORROW ── */}
            {upcomingTomorrow.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-4 py-2 bg-[#05080f]">
                  <span className="text-[11px] font-black text-gray-300 uppercase tracking-wider">TOMORROW</span>
                  <span className="text-[10px] font-bold text-gray-500">{upcomingTomorrow.length} fixtures</span>
                </div>
                <div className="divide-y divide-[#0d1220]">
                  {upcomingTomorrow.map((m) => {
                    const home = teamById(m.homeId);
                    const away = teamById(m.awayId);
                    const league = leagueById(m.leagueId);
                    const kickoffStr = formatTimeGhana(m.kickoff);
                    const market = m.markets.find((mk) => mk.id === "1x2") || m.markets[0];
                    const opts = market?.options || [];
                    return (
                      <div key={m.id} className="px-4 py-3 bg-[#000000] hover:bg-[#07090e] transition-colors flex items-center justify-between gap-3">
                        <Link to="/match/$matchId" params={{ matchId: m.id }} className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 text-[10px] text-gray-500 font-semibold">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span className="font-extrabold text-gray-300">{kickoffStr}</span>
                            <span className="truncate inline-flex items-center gap-1">
                              {league?.logo ? <img src={league.logo} alt="" className="h-3 w-3 rounded-full object-cover shrink-0" /> : null}
                              {league?.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-200 truncate">
                            {home?.logo && <img src={home.logo} alt="" className="h-3.5 w-3.5 rounded-full object-cover shrink-0 bg-white/10" />}
                            <span className="truncate">{home?.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-200 truncate">
                            {away?.logo && <img src={away.logo} alt="" className="h-3.5 w-3.5 rounded-full object-cover shrink-0 bg-white/10" />}
                            <span className="truncate">{away?.name}</span>
                          </div>
                        </Link>
                        <div className="grid grid-cols-3 gap-1 w-40 shrink-0">
                          {[0, 1, 2].map((i) => {
                            const opt = opts[i];
                            if (!opt) return <div key={i} className="h-10 bg-[#0d1220] rounded border border-[#141824] opacity-30" />;
                            const active = isSelected(m.id, market?.id || "1x2", opt.id);
                            const isLocked = isMatchLocked(m);
                            return (
                              <button
                                key={opt.id}
                                disabled={isLocked}
                                onClick={() => {
                                  if (isLocked) {
                                    toast.error(m.status === "FINISHED" ? "This match has ended. Odds are locked." : "This match has kicked off. Odds are locked until the game ends.");
                                    return;
                                  }
                                  toggleSelection({ matchId: m.id, marketId: market?.id || "1x2", marketName: market?.name || "1X2", optionId: opt.id, optionLabel: opt.label, multiplier: opt.multiplier });
                                }}
                                className={cn(
                                  "h-10 rounded flex flex-col items-center justify-center font-mono text-[11px] font-bold border transition-all",
                                  isLocked
                                    ? "bg-[#0b0e14] border-[#141824] text-gray-600 cursor-not-allowed opacity-50"
                                    : active
                                    ? "bg-[#F5C400] border-[#F5C400] text-black font-black"
                                    : "bg-[#111520] border-[#1b2030] text-white hover:border-[#F5C400]/40"
                                )}
                              >
                                {isLocked ? (
                                  <Lock className="w-3 h-3 text-gray-500" />
                                ) : (
                                  <>
                                    <span className="text-[8px] font-bold opacity-60">{opt.label}</span>
                                    <span>{opt.multiplier.toFixed(2)}</span>
                                  </>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {upcomingToday.length === 0 && upcomingTomorrow.length === 0 && (
              <div className="p-10 text-center text-gray-600 text-xs font-bold">
                No upcoming fixtures found for today or tomorrow.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
