import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronRight,
  SlidersHorizontal,
  TrendingUp,
  Tv,
  Trophy,
  QrCode,
  MoreHorizontal,
  Radio,
  Flame,
  Lock,
} from "lucide-react";
import { LoadCodeModal } from "@/components/common/LoadCodeModal";
import {
  dayBucket,
  leagueById,
  teamById,
  isMatchLocked,
  type Match,
} from "@/data/football";
import { useBetrix } from "@/store/betrix";
import { cn } from "@/lib/utils";
import { formatTimeGhana, isoDateGhana } from "@/lib/ghana-time";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BETRIX — Live Sports Betting, Football Odds & In-Play" },
      { name: "description", content: "Live sports betting, in-play football odds, virtual points and fast payouts on BETRIX." },
    ],
  }),
  component: HomePage,
});

// ------- Fixture Row (Primestakers Style) -------
function FixtureRow({
  match,
  selectedMarket = "1X2",
}: {
  match: Match;
  selectedMarket?: string;
}) {
  const { toggleSelection, isSelected } = useBetrix();
  const home = teamById(match.homeId) || { name: "Botafogo FC SP", short: "BOT" };
  const away = teamById(match.awayId) || { name: "AA Ponte Preta SP", short: "PON" };
  const league = leagueById(match.leagueId);

  const disabled = isMatchLocked(match);
  const isLive = match.status === "LIVE";
  const matchCode = match.code || `#${60000 + (parseInt(match.id.replace(/\D/g, "") || "1") * 17) % 29000}`;
  const extraCount = match.markets.length * 5 + (parseInt(match.id.replace(/\D/g, "") || "1") % 10) + 15;

  const isHot = match.hot || parseInt(match.id.replace(/\D/g, "") || "0") % 2 === 0;

  // Format Kickoff Time in Ghana GMT e.g. "10:30 PM"
  const kickoffTimeStr = useMemo(() => {
    return formatTimeGhana(match.kickoff);
  }, [match.kickoff]);

  // Determine market options based on active market selection tab
  const marketOptions = useMemo(() => {
    const seed = parseInt(match.id.replace(/\D/g, "") || "1");
    if (selectedMarket === "O/U 2.5") {
      return [
        { id: "opt_over_25", label: "Over 2.5", multiplier: Number((1.85 + (seed % 15) / 100).toFixed(2)) },
        { id: "opt_under_25", label: "Under 2.5", multiplier: Number((1.95 + (seed % 15) / 100).toFixed(2)) },
      ];
    }
    if (selectedMarket === "DC") {
      return [
        { id: "opt_dc_1x", label: `${home.short} or Draw`, multiplier: Number((1.05 + (seed % 10) / 100).toFixed(2)) },
        { id: "opt_dc_12", label: `${home.short} or ${away.short}`, multiplier: Number((1.12 + (seed % 10) / 100).toFixed(2)) },
        { id: "opt_dc_x2", label: `Draw or ${away.short}`, multiplier: Number((2.40 + (seed % 30) / 100).toFixed(2)) },
      ];
    }
    if (selectedMarket === "BTTS") {
      return [
        { id: "opt_btts_yes", label: "Yes", multiplier: Number((1.75 + (seed % 15) / 100).toFixed(2)) },
        { id: "opt_btts_no", label: "No", multiplier: Number((2.05 + (seed % 20) / 100).toFixed(2)) },
      ];
    }
    if (selectedMarket === "Handicap") {
      return [
        { id: "opt_h1_home", label: `${home.short} (-1)`, multiplier: Number((1.71 + (seed % 20) / 100).toFixed(2)) },
        { id: "opt_h1_draw", label: "Draw (0:1)", multiplier: Number((3.75 + (seed % 30) / 100).toFixed(2)) },
        { id: "opt_h1_away", label: `${away.short} (+1)`, multiplier: Number((4.10 + (seed % 50) / 100).toFixed(2)) },
      ];
    }
    if (selectedMarket === "HT/FT") {
      return [
        { id: "opt_htft_11", label: `${home.short}/${home.short}`, multiplier: Number((2.10 + (seed % 20) / 100).toFixed(2)) },
        { id: "opt_htft_x1", label: `Draw/${home.short}`, multiplier: Number((4.50 + (seed % 40) / 100).toFixed(2)) },
        { id: "opt_htft_22", label: `${away.short}/${away.short}`, multiplier: Number((7.50 + (seed % 90) / 100).toFixed(2)) },
      ];
    }

    // Default 1X2 market options
    const m1X2 = match.markets.find((m) => m.id === "1x2");
    if (m1X2 && m1X2.options.length === 3) return m1X2.options;

    return [
      { id: "opt_home", label: "1", multiplier: Number((1.23 + (seed % 80) / 100).toFixed(2)) },
      { id: "opt_draw", label: "X", multiplier: Number((3.50 + (seed % 150) / 100).toFixed(2)) },
      { id: "opt_away", label: "2", multiplier: Number((4.60 + (seed % 300) / 100).toFixed(2)) },
    ];
  }, [match, selectedMarket, home, away]);

  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-2 px-3 py-3 border-b border-[#18181d] last:border-b-0 hover:bg-[#16161c] transition-colors">
      {/* Left Column: Match Details & Teams */}
      <Link
        to="/match/$matchId"
        params={{ matchId: match.id }}
        className="min-w-0 flex items-center justify-between pr-2 group outline-none"
      >
        <div className="min-w-0 flex-1 space-y-1">
          {/* Match metadata top tag line */}
          <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-400">
            {isHot && (
              <span className="inline-flex items-center gap-0.5 rounded bg-[#F5C400] px-1.5 py-0.2 text-[9px] font-black text-black uppercase">
                HOT <Flame className="h-2.5 w-2.5 fill-black" />
              </span>
            )}
            {match.status === "FINISHED" && (
              <span className="rounded bg-gray-700/60 px-1 py-0.2 text-[9px] font-black text-gray-300">
                FT
              </span>
            )}
            {match.status === "LIVE" && (
              <span className="rounded bg-emerald-500/20 px-1 py-0.2 text-[9px] font-black text-emerald-400 border border-emerald-500/30 animate-pulse">
                LIVE {match.minute ? `${match.minute}'` : ""}
              </span>
            )}
            <span className="font-extrabold text-white">{kickoffTimeStr}</span>
            <span className="text-gray-500 font-mono">{matchCode}</span>
            <span className="truncate text-gray-400 font-medium inline-flex items-center gap-1">
              {league?.logo ? (
                <img src={league.logo} alt="" className="h-3 w-3 rounded-full object-cover shrink-0" />
              ) : null}
              {league?.name || "Brasileiro Serie B"}
            </span>
          </div>

          {/* Teams Stacked with logos */}
          <div className="space-y-1 pt-0.5">
            <div className="flex items-center gap-1.5 truncate text-xs sm:text-sm font-extrabold text-white tracking-tight group-hover:text-[#F5C400] transition-colors">
              {home.logo ? (
                <img src={home.logo} alt="" className="h-4 w-4 rounded-full object-cover shrink-0 bg-white/10" />
              ) : (
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: home.color || "#DA291C" }} />
              )}
              <span className="truncate">{home.name}</span>
            </div>
            <div className="flex items-center gap-1.5 truncate text-xs sm:text-sm font-extrabold text-white tracking-tight group-hover:text-[#F5C400] transition-colors">
              {away.logo ? (
                <img src={away.logo} alt="" className="h-4 w-4 rounded-full object-cover shrink-0 bg-white/10" />
              ) : (
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: away.color || "#034694" }} />
              )}
              <span className="truncate">{away.name}</span>
            </div>
          </div>

          {/* Extra Markets yellow link */}
          <div className="pt-0.5">
            <span className="text-[11px] font-bold text-[#F5C400] hover:underline flex items-center gap-0.5">
              +{extraCount} &rsaquo;
            </span>
          </div>
        </div>

        {/* Live / Finished Score / Trend Icon */}
        <div className="flex flex-col items-center justify-center px-2 text-xs font-black tabular-nums text-gray-300">
          {isLive || match.status === "FINISHED" ? (
            <>
              <span className={cn(match.status === "FINISHED" && "text-gray-400")}>{match.homeScore ?? 0}</span>
              <span className={cn(match.status === "FINISHED" && "text-gray-400")}>{match.awayScore ?? 0}</span>
            </>
          ) : (
            <TrendingUp className="h-4 w-4 text-gray-600 group-hover:text-gray-400" />
          )}
        </div>
      </Link>

      {/* Right Column: Odds Buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        {marketOptions.map((opt) => {
          const active = isSelected(match.id, selectedMarket, opt.id);
          const isLocked = isMatchLocked(match);

          return (
            <button
              key={opt.id}
              type="button"
              disabled={isLocked}
              aria-pressed={active}
              title={isLocked ? "Odds locked — match has started" : undefined}
              onClick={() => {
                if (isLocked) {
                  toast.error(
                    match.status === "FINISHED"
                      ? "This match has ended. Odds are locked."
                      : "This match has already kicked off. Odds are locked until the game ends."
                  );
                  return;
                }
                toggleSelection({
                  matchId: match.id,
                  marketId: selectedMarket,
                  marketName: selectedMarket,
                  optionId: opt.id,
                  optionLabel: opt.label,
                  multiplier: opt.multiplier,
                });
              }}
              className={cn(
                "flex h-11 w-12 sm:w-14 flex-col items-center justify-center rounded-lg font-black text-xs transition-all duration-150 border",
                isLocked
                  ? "bg-[#141418] border-[#22222a] text-gray-500 cursor-not-allowed opacity-60"
                  : active
                  ? "bg-[#F5C400] text-black border-[#F5C400] shadow-[0_0_10px_rgba(245,196,0,0.4)] active:scale-[0.96]"
                  : "bg-[#1f1f26] text-white hover:bg-[#272730] border-[#292933] active:scale-[0.96]"
              )}
            >
              {isLocked ? (
                <div className="flex flex-col items-center justify-center gap-0.5">
                  <Lock className="h-3.5 w-3.5 text-gray-500" />
                  <span className="text-[8px] font-black text-gray-500 uppercase tracking-tight">
                    {match.status === "FINISHED" ? "Ended" : "Locked"}
                  </span>
                </div>
              ) : (
                <span className="text-xs font-extrabold tabular-nums">{opt.multiplier.toFixed(2)}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ------- Main HomePage -------
function HomePage() {
  const [loadCodeOpen, setLoadCodeOpen] = useState(false);
  const [selectedSport, setSelectedSport] = useState("all");
  const [expandedLive, setExpandedLive] = useState(false);

  // Sub-navigation tabs (Highlights | Today | Countries)
  const [subTab, setSubTab] = useState<"Highlights" | "Today" | "Countries">("Highlights");

  // Market Selection tabs (1X2 | O/U 2.5 | DC | BTTS | Handicap | HT/FT | 1UP)
  const [activeMarket, setActiveMarket] = useState<string>("1X2");
  const [is1UpActive, setIs1UpActive] = useState(false);

  const { allMatches } = useBetrix();

  // All Live Matches
  const liveMatches = useMemo(() => {
    return allMatches.filter((m) => m.status === "LIVE");
  }, [allMatches]);

  // Show only 5 live matches unless expanded
  const visibleLiveMatches = useMemo(() => {
    return expandedLive ? liveMatches : liveMatches.slice(0, 5);
  }, [liveMatches, expandedLive]);

  // Upcoming / Fixture Matches filtered by selected sport
  const filteredFixtures = useMemo(() => {
    return allMatches.filter((m) => {
      if (selectedSport !== "all" && m.sportId !== selectedSport) return false;
      return true;
    });
  }, [allMatches, selectedSport]);

  // Group fixtures by Date bucket (Today vs Tomorrow) using Ghana time
  const groupedFixtures = useMemo(() => {
    const buckets: { TODAY: Match[]; TOMORROW: Match[] } = { TODAY: [], TOMORROW: [] };
    for (const m of filteredFixtures) {
      const b = dayBucket(m.kickoff);
      if (b === "Today" || m.status === "LIVE") {
        buckets.TODAY.push(m);
      } else {
        buckets.TOMORROW.push(m);
      }
    }
    return buckets;
  }, [filteredFixtures]);

  // Dynamic Ghana date labels for the section headers
  const todayLabel = useMemo(() => {
    const d = new Date(isoDateGhana(0) + "T12:00:00Z");
    return d.toLocaleDateString("en-US", { weekday: "long", month: "2-digit", day: "2-digit", timeZone: "Africa/Accra" });
  }, []);
  const todayShort = useMemo(() => {
    const d = new Date(isoDateGhana(0) + "T12:00:00Z");
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", timeZone: "Africa/Accra" })
      + " " + d.toLocaleDateString("en-US", { weekday: "short", timeZone: "Africa/Accra" });
  }, []);
  const tomorrowShort = useMemo(() => {
    const d = new Date(isoDateGhana(1) + "T12:00:00Z");
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", timeZone: "Africa/Accra" })
      + " " + d.toLocaleDateString("en-US", { weekday: "short", timeZone: "Africa/Accra" });
  }, []);

  return (
    <div className="flex flex-col bg-[#0e0e11] min-h-screen text-white font-sans select-none">
      <LoadCodeModal open={loadCodeOpen} onOpenChange={setLoadCodeOpen} />

      {/* 1. HERO PROMO BANNER */}
      <div className="relative overflow-hidden bg-[#121217] border-b border-[#1f1f26] p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              BET SMART. <span className="text-[#F5C400]">WIN BIG.</span>
            </h1>
            <p className="text-xs text-gray-400 font-medium">
              Live odds on 30+ sports · Instant casino payouts
            </p>
          </div>

          <div className="shrink-0 flex items-center justify-center h-14 w-14 rounded-full bg-gradient-to-br from-[#F5C400] to-[#b38f00] p-0.5 shadow-[0_0_15px_rgba(245,196,0,0.3)]">
            <div className="flex flex-col items-center justify-center h-full w-full rounded-full bg-[#121217] text-[#F5C400]">
              <span className="text-[10px] font-black leading-none">BETRIX</span>
              <span className="text-[7px] font-extrabold uppercase text-white">PRO</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. QUICK ACTION GRID BUTTONS (4 Items) */}
      <div className="grid grid-cols-4 gap-2.5 p-3 bg-[#0c0c0e]">
        <Link
          to="/matches"
          className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-[#18181d] border border-[#25252c] p-2.5 hover:border-[#383842] active:scale-95 transition-all text-center"
        >
          <Trophy className="h-5 w-5 text-[#F5C400]" />
          <span className="text-[11px] font-extrabold text-gray-200 leading-tight">All Sports</span>
        </Link>

        <Link
          to="/live"
          className="relative flex flex-col items-center justify-center gap-1.5 rounded-xl bg-[#2a171a] border border-[#482025] p-2.5 hover:border-red-500 active:scale-95 transition-all text-center"
        >
          <div className="relative">
            <Tv className="h-5 w-5 text-red-500" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 animate-ping" />
          </div>
          <span className="text-[11px] font-extrabold text-white leading-tight">Live</span>
        </Link>

        <button
          type="button"
          onClick={() => setLoadCodeOpen(true)}
          className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-[#261f12] border border-[#483a20] p-2.5 hover:border-[#F5C400] active:scale-95 transition-all text-center"
        >
          <QrCode className="h-5 w-5 text-[#F5C400]" />
          <span className="text-[11px] font-extrabold text-gray-200 leading-tight">Load Code</span>
        </button>

        <Link
          to="/matches"
          className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-[#191c2b] border border-[#272d45] p-2.5 hover:border-blue-500 active:scale-95 transition-all text-center"
        >
          <MoreHorizontal className="h-5 w-5 text-indigo-400" />
          <span className="text-[11px] font-extrabold text-gray-200 leading-tight">More</span>
        </Link>
      </div>

      {/* 3. FEATURED COMPETITION BANNERS */}
      <div className="flex gap-2.5 px-3 pb-3 overflow-x-auto no-scrollbar">
        <Link
          to="/matches"
          className="relative shrink-0 w-[140px] rounded-xl bg-[#14231b] border border-[#1f3c2b] p-3 active:scale-95 transition-all"
        >
          <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-[#00A859] rounded-r-sm" />
          <div className="flex justify-between items-start">
            <span className="text-xs font-black text-white leading-tight">
              TODAY'S<br />FOOTBALL
            </span>
            <ChevronRight className="h-4 w-4 text-[#00A859]" />
          </div>
        </Link>

        <Link
          to="/matches"
          className="relative shrink-0 w-[140px] rounded-xl bg-[#241e12] border border-[#42361f] p-3 active:scale-95 transition-all"
        >
          <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-[#F5C400] rounded-r-sm" />
          <div className="flex justify-between items-start">
            <span className="text-xs font-black text-white leading-tight">
              WORLD CUP<br />2026
            </span>
            <ChevronRight className="h-4 w-4 text-[#F5C400]" />
          </div>
        </Link>

        <Link
          to="/matches"
          className="relative shrink-0 w-[140px] rounded-xl bg-[#171a2b] border border-[#262c48] p-3 active:scale-95 transition-all"
        >
          <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-[#3b82f6] rounded-r-sm" />
          <div className="flex justify-between items-start">
            <span className="text-xs font-black text-white leading-tight">
              MLB<br />BASEBALL
            </span>
            <ChevronRight className="h-4 w-4 text-blue-500" />
          </div>
        </Link>
      </div>

      {/* 4. LIVE EVENTS SECTION (Max 5 Live Rows + Expand Link as in Image 1) */}
      <div className="bg-[#0b0b0e] border-y border-[#1a1a20]">
        {/* Live Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#18181f] bg-[#0e0e11]">
          <div className="flex items-center gap-2 text-xs font-black text-white">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span>LIVE MATCHES ({liveMatches.length})</span>
          </div>

          <div className="flex items-center gap-1.5 pr-0.5 text-xs font-extrabold text-gray-400">
            {["1", "X", "2"].map((h) => (
              <span key={h} className="w-12 sm:w-14 text-center">
                {h}
              </span>
            ))}
          </div>
        </div>

        {/* First 5 Live Matches */}
        <div>
          {visibleLiveMatches.map((m) => (
            <FixtureRow key={m.id} match={m} selectedMarket="1X2" />
          ))}
        </div>

        {/* Collapsed Link: "All Live Events 73 ›" (Primestakers Style) */}
        <div className="p-3 text-center bg-[#0e0e11] border-t border-[#18181f]">
          <button
            type="button"
            onClick={() => setExpandedLive(!expandedLive)}
            className="inline-flex items-center gap-1 text-xs font-black text-[#F5C400] hover:underline transition-all"
          >
            {expandedLive ? "Show Top 5 Live Events ‹" : `All Live Events ${liveMatches.length * 9 + 1} ›`}
          </button>
        </div>
      </div>

      {/* 5. MATCH FIXTURES SORTING & FILTERING BAR (Primestakers Style - Image 2) */}
      <div className="bg-[#121217] pt-3 space-y-3">
        {/* Sport Selector Pills Horizontal Scroll Bar */}
        <div className="flex items-center gap-2 px-3 overflow-x-auto no-scrollbar">
          {[
            { id: "all", label: "All", icon: null },
            { id: "football", label: "Football", icon: "⚽" },
            { id: "tabletennis", label: "Table Tennis", icon: "🏓", hot: true },
            { id: "basketball", label: "Basketball", icon: "🏀" },
            { id: "baseball", label: "Baseball", icon: "⚾" },
            { id: "tennis", label: "Tennis", icon: "🎾" },
          ].map((sp) => {
            const isActive = selectedSport === sp.id;
            return (
              <button
                key={sp.id}
                type="button"
                onClick={() => setSelectedSport(sp.id)}
                className={cn(
                  "relative shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all",
                  isActive
                    ? "bg-[#F5C400] text-black shadow-md font-extrabold"
                    : "bg-[#21212a] text-gray-300 hover:bg-[#2b2b36]"
                )}
              >
                {sp.icon && <span>{sp.icon}</span>}
                <span>{sp.label}</span>
                {sp.hot && (
                  <span className="absolute -top-1 -right-1 rounded-full bg-red-600 px-1 py-0.2 text-[8px] font-black text-white uppercase">
                    HOT
                  </span>
                )}
              </button>
            );
          })}

          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#21212a] text-gray-400 hover:text-white"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* Sub-navigation Tabs: Highlights | Today | Countries */}
        <div className="flex items-center gap-6 px-4 border-b border-[#21212a] text-xs font-bold">
          {(["Highlights", "Today", "Countries"] as const).map((tab) => {
            const isActive = subTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setSubTab(tab)}
                className={cn(
                  "relative pb-2.5 transition-colors",
                  isActive ? "text-white font-extrabold" : "text-gray-400 hover:text-gray-200"
                )}
              >
                {tab}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full bg-[#F5C400]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Market Options Bar: 1X2 | O/U 2.5 | DC | BTTS | Handicap | HT/FT | 1UP */}
        <div className="flex items-center justify-between px-3 pb-2 text-xs font-extrabold overflow-x-auto no-scrollbar gap-4">
          <div className="flex items-center gap-3">
            {["1X2", "O/U 2.5", "DC", "BTTS", "Handicap", "HT/FT"].map((mkt) => {
              const isActive = activeMarket === mkt;
              return (
                <button
                  key={mkt}
                  type="button"
                  onClick={() => setActiveMarket(mkt)}
                  className={cn(
                    "relative pb-1 transition-colors whitespace-nowrap",
                    isActive ? "text-white font-black" : "text-gray-400 hover:text-gray-200"
                  )}
                >
                  {mkt}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full bg-[#F5C400]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* 1UP Toggle Pill */}
          <div className="flex items-center gap-1.5 shrink-0 pl-2">
            <span className="text-[11px] font-black text-gray-300">1<sup>UP</sup></span>
            <button
              type="button"
              onClick={() => setIs1UpActive(!is1UpActive)}
              className={cn(
                "h-4 w-7 rounded-full transition-colors relative p-0.5",
                is1UpActive ? "bg-[#F5C400]" : "bg-gray-700"
              )}
            >
              <span
                className={cn(
                  "block h-3 w-3 rounded-full bg-white transition-transform",
                  is1UpActive ? "translate-x-3 bg-black" : "translate-x-0"
                )}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 6. FIXTURES DATE BUCKETS (TODAY / TOMORROW) */}
      <div className="bg-[#0e0e11] flex-1">
        {/* Date header bar: dynamic Ghana date | LIVE ODDS */}
        <div className="flex items-center justify-between px-3 py-2 bg-[#17171d] border-b border-[#21212a] text-xs font-bold text-gray-200">
          <span>{todayLabel}</span>
          <span className="flex items-center gap-1 text-[#F5C400] text-[11px]">
            <Radio className="h-3 w-3" /> LIVE ODDS · 1662 matches
          </span>
        </div>

        {/* Bucket 1: TODAY */}
        <div>
          <div className="flex items-center justify-between px-3 py-2 bg-[#121217] text-xs font-black text-[#F5C400]">
            <span>TODAY</span>
            <span className="text-gray-400 text-[11px]">{groupedFixtures.TODAY.length}</span>
          </div>

          {/* Sub-header bar: dynamic today date | 1 X 2 */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#17171d] border-y border-[#21212a] text-[11px] font-extrabold text-gray-400">
            <span>{todayShort}</span>
            <div className="flex items-center gap-1.5 pr-0.5">
              {["1", "X", "2"].map((h) => (
                <span key={h} className="w-12 sm:w-14 text-center">
                  {h}
                </span>
              ))}
            </div>
          </div>

          {/* Fixture Rows for TODAY */}
          {groupedFixtures.TODAY.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-500 bg-[#121217]">
              No matches scheduled for today from live feeds.
            </div>
          ) : (
            groupedFixtures.TODAY.map((m) => (
              <FixtureRow key={m.id} match={m} selectedMarket={activeMarket} />
            ))
          )}
        </div>

        {/* Bucket 2: TOMORROW */}
        <div className="mt-3 border-t border-[#21212a]">
          <div className="flex items-center justify-between px-3 py-2 bg-[#121217] text-xs font-black text-[#F5C400]">
            <span>TOMORROW</span>
            <span className="text-gray-400 text-[11px]">
              {groupedFixtures.TOMORROW.length}
            </span>
          </div>

          {/* Sub-header bar: dynamic tomorrow date | 1 X 2 */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#17171d] border-y border-[#21212a] text-[11px] font-extrabold text-gray-400">
            <span>{tomorrowShort}</span>
            <div className="flex items-center gap-1.5 pr-0.5">
              {["1", "X", "2"].map((h) => (
                <span key={h} className="w-12 sm:w-14 text-center">
                  {h}
                </span>
              ))}
            </div>
          </div>

          {/* Fixture Rows for TOMORROW */}
          {groupedFixtures.TOMORROW.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-500 bg-[#121217]">
              No matches scheduled for tomorrow from live feeds.
            </div>
          ) : (
            groupedFixtures.TOMORROW.map((m) => (
              <FixtureRow key={`tomorrow_${m.id}`} match={m} selectedMarket={activeMarket} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
