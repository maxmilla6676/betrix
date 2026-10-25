import { useState, useMemo, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  HelpCircle,
  Receipt,
  Share2,
  BarChart2,
  ShieldCheck,
  TrendingUp,
  RotateCcw,
  Sparkles,
  Ticket,
  LayoutGrid,
  Info,
  X,
  CornerUpRight,
  Plus,
  Clock,
  CalendarDays,
  Pencil,
  Trophy,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatGHS, useBetrix, selectionMatch, type Selection, type HistoryEntry } from "@/store/betrix";
import { teamById } from "@/data/football";
import { cn } from "@/lib/utils";
import { GHANA_TZ } from "@/lib/ghana-time";
import { HowToCashoutModal } from "@/components/common/HowToCashoutModal";
import { PaymentGatewayModal } from "@/components/payment/PaymentGatewayModal";
import { TicketDetailsModal } from "@/components/common/TicketDetailsModal";
import { fetchPublicSlipsFromBackend } from "@/services/backendSync";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "My Bets & History — BETRIX" },
      {
        name: "description",
        content:
          "View your open bets, active cashout slips, and recommended popular football booking codes.",
      },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const {
    history,
    isLoggedIn,
    balance,
    loadSlip,
    showWinningCup,
  } = useBetrix();


  // Top Tabs: 'open' | 'history'
  const [mainTab, setMainTab] = useState<"open" | "history">("open");

  // Sub-filters under Open Bets: 'all' | 'cashout' | 'live'
  const [subFilter, setSubFilter] = useState<"all" | "cashout" | "live">("all");

  // History tab filters — defaults to "Settled" and "Won" to show actual won tickets
  const [historyStatusFilter, setHistoryStatusFilter] = useState<"Settled" | "All" | "Won" | "Lost" | "Running">("Settled");
  const [historyResultFilter, setHistoryResultFilter] = useState<"All" | "Won" | "Lost">("Won");
  const [historyStatusOpen, setHistoryStatusOpen] = useState(false);
  const [historyResultOpen, setHistoryResultOpen] = useState(false);
  const [historyDateFilter, setHistoryDateFilter] = useState<string>(""); // "YYYY-MM-DD" or ""
  const [historyCalendarOpen, setHistoryCalendarOpen] = useState(false);
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Record<string, boolean>>({});

  const toggleHistoryExpand = (code: string) => {
    setExpandedHistoryIds(prev => ({ ...prev, [code]: !prev[code] }));
  };

  const handleEditBet = (h: HistoryEntry) => {
    if (h.selections && h.selections.length > 0) {
      loadSlip(h.selections);
      toast.success(`${h.selections.length} selections from bet ${h.code} loaded into your betslip!`, {
        description: "Review and adjust your stake, then place again.",
      });
    } else {
      toast.info("No selections found for this bet.");
    }
  };

  const cashedOutCodes: Record<string, number> = {};
  const [codesAccordionOpen, setCodesAccordionOpen] = useState(true);
  const [expandedCodeIds, setExpandedCodeIds] = useState<Record<string, boolean>>({});
  const [cashoutModalOpen, setCashoutModalOpen] = useState(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [communitySlips, setCommunitySlips] = useState<HistoryEntry[]>([]);
  const [loadingCommunitySlips, setLoadingCommunitySlips] = useState(false);

  useEffect(() => {
    setLoadingCommunitySlips(true);
    fetchPublicSlipsFromBackend(8).then((slips) => {
      setCommunitySlips(slips);
      setLoadingCommunitySlips(false);
    });
  }, []);
  const [showAutoCashoutBanner, setShowAutoCashoutBanner] = useState(true);
  const [expandedBetCodes, setExpandedBetCodes] = useState<Record<string, boolean>>({});

  const toggleExpandBet = (code: string) => {
    setExpandedBetCodes((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  // Open Bets list (status === 'PENDING' and not cashed out)
  const openBets = useMemo(() => {
    return history.filter((h) => h.status === "PENDING" && !cashedOutCodes[h.code]);
  }, [history, cashedOutCodes]);

  const [selectedTicketForDetails, setSelectedTicketForDetails] = useState<HistoryEntry | null>(null);
  const [deletedTicketCodes, setDeletedTicketCodes] = useState<Record<string, boolean>>({});

  // Settled History list — strictly actual user tickets from real history, NO dummy data
  const settledBets = useMemo(() => {
    const userSettled = history.filter(
      (h) => !deletedTicketCodes[h.code] && (h.status !== "PENDING" || !!cashedOutCodes[h.code]),
    );
    if (historyResultFilter === "Lost" || historyStatusFilter === "Lost") {
      return userSettled.filter((h) => h.status === "LOST");
    }
    if (historyStatusFilter === "All" && historyResultFilter === "All") {
      return userSettled;
    }
    // By default: ONLY actual won tickets from real user betting history
    return userSettled.filter((h) => h.status === "WON");
  }, [history, cashedOutCodes, historyStatusFilter, historyResultFilter, deletedTicketCodes]);

  // Filtered settled bets — applies status, result, and date filters
  const filteredSettledBets = useMemo(() => {
    return settledBets.filter((h) => {
      // Status filter
      if (historyStatusFilter === "Settled" && h.status === "PENDING") return false;
      if (historyStatusFilter === "Running" && h.status !== "PENDING") return false;
      if (historyStatusFilter === "Won" && h.status !== "WON") return false;
      if (historyStatusFilter === "Lost" && h.status !== "LOST") return false;

      // Result filter
      if (historyResultFilter === "Won" && h.status !== "WON") return false;
      if (historyResultFilter === "Lost" && h.status !== "LOST") return false;

      // Date filter — compare "YYYY-MM-DD" prefix of createdAt
      if (historyDateFilter) {
        const betDay = h.createdAt.slice(0, 10);
        if (betDay !== historyDateFilter) return false;
      }

      return true;
    });
  }, [settledBets, historyStatusFilter, historyResultFilter, historyDateFilter]);

  // Group bets by date for the timeline indicator on the left
  const groupedSettledBets = useMemo(() => {
    const groups: { dateKey: string; day: string; mon: string; bets: HistoryEntry[] }[] = [];
    const map = new Map<string, { dateKey: string; day: string; mon: string; bets: HistoryEntry[] }>();

    for (const h of filteredSettledBets) {
      const d = new Date(h.createdAt);
      const dateKey = !isNaN(d.getTime()) ? h.createdAt.slice(0, 10) : "2026-10-20";
      const day = !isNaN(d.getTime())
        ? d.toLocaleDateString("en-GB", { day: "numeric", timeZone: GHANA_TZ })
        : "20";
      const mon = !isNaN(d.getTime())
        ? d.toLocaleDateString("en-US", { month: "short", timeZone: GHANA_TZ })
        : "Oct";

      let g = map.get(dateKey);
      if (!g) {
        g = { dateKey, day, mon, bets: [] };
        map.set(dateKey, g);
        groups.push(g);
      }
      g.bets.push(h);
    }
    return groups;
  }, [filteredSettledBets]);

  // Filtered open bets based on sub-filter
  const filteredOpenBets = useMemo(() => {
    if (subFilter === "cashout") {
      return openBets.filter((b) => b.cashoutAvailable === true);
    }
    if (subFilter === "live") {
      return openBets.filter((b) => b.isLive === true);
    }
    return openBets;
  }, [openBets, subFilter]);

  // Cashout needs server-side pricing; until then no bet is ever marked cashout-available.
  const handleCashout = (code: string, _stake: number, _selectionsCount: number) => {
    toast.info(`Cashout is not available for ${code} yet.`);
  };

  const handleCopyCode = (codeStr: string) => {
    void navigator.clipboard.writeText(codeStr);
    setCopiedCode(codeStr);
    toast.success(`Booking code ${codeStr} copied!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleShareBet = (h: HistoryEntry) => {
    const text = `Check out my ongoing bet on BETRIX: ${h.code} (Stake: ${h.stake.toFixed(2)}, ${h.matchTitle || "Match"})!`;
    if (navigator.share) {
      navigator.share({ title: `BETRIX Bet: ${h.code}`, text }).catch(() => {});
    } else {
      void navigator.clipboard.writeText(text);
      toast.success(`Bet code ${h.code} copied! Share it with friends.`);
    }
  };

  const handleRebet = (h: HistoryEntry) => {
    if (h.selections && h.selections.length > 0) {
      loadSlip(h.selections);
      toast.success(`Loaded selections from ${h.code} into your betslip for rebet!`);
    } else {
      toast.info(`Selections loaded for rebet!`);
    }
  };

  const handleShareCode = (slip: HistoryEntry) => {
    const folds = slip.selections?.length || 0;
    const odds = (slip.selections || []).reduce((acc, s) => acc * s.multiplier, 1).toFixed(2);
    const text = `Check out this BETRIX booking code: ${slip.code} (${folds} folds, Odds: ${odds})! Load it on BETRIX to win!`;
    if (navigator.share) {
      navigator.share({ title: `BETRIX Code: ${slip.code}`, text }).catch(() => {});
    } else {
      void navigator.clipboard.writeText(text);
      toast.success(`Booking code ${slip.code} copied! Share it with friends.`);
    }
  };

  const handleAddToBetslip = (slip: HistoryEntry) => {
    if (slip.selections && slip.selections.length > 0) {
      loadSlip(slip.selections);
      toast.success(`Loaded ${slip.selections.length} selections from code ${slip.code} into betslip!`);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#101319] text-white font-sans select-none pb-24">
      {/* ── 1. TOP HEADER (Exact Match: '? How to Cashout?' | User Avatar + 'GHS xx.xx') ── */}
      <header className="sticky top-0 z-40 w-full bg-[#161a23] border-b border-[#222938] shadow-md">
        <div className="mx-auto w-full max-w-5xl flex h-12 items-center justify-between px-3 md:px-5">
          {/* Left: Help / How to cashout */}
          <button
            type="button"
            onClick={() => setCashoutModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-300 hover:text-white transition-colors py-1 group"
          >
            <div className="h-4 w-4 rounded-full border border-gray-400 flex items-center justify-center text-[10px] font-bold text-gray-300 group-hover:border-white group-hover:text-white">
              ?
            </div>
            <span>How to Cashout?</span>
          </button>

          {/* Right: Deposited betting balance in gold/yellow */}
          <button
            type="button"
            onClick={() => setDepositModalOpen(true)}
            title="Betting Account Balance (Tap to Deposit)"
            className="flex items-center gap-2 group active:scale-95 transition-transform cursor-pointer"
          >
            <div className="h-6 w-6 rounded-full border border-[#F5C400]/70 overflow-hidden bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-300 flex items-center justify-center text-[10px] font-black text-black shadow-xs">
              <span className="font-mono text-[9px] font-extrabold text-white drop-shadow-xs">₵</span>
            </div>
            <span className="text-xs font-black font-mono tracking-tight text-[#F5C400] group-hover:brightness-110">
              GHS {balance.toFixed(2)}
            </span>
          </button>
        </div>

        {/* ── 2. MAIN SEGMENTED TABS: [ Open Bets (N) ] [ Bet History ] (Matches Screenshot) ── */}
        <div className="mx-auto w-full max-w-5xl px-3 md:px-5 pb-3">
          <div className="grid grid-cols-2 gap-2 bg-[#12161f] p-1 rounded-xl border border-[#202633]">
            <button
              type="button"
              onClick={() => setMainTab("open")}
              className={cn(
                "py-2.5 text-xs rounded-lg transition-all text-center",
                mainTab === "open"
                  ? "bg-white text-black shadow-md font-black"
                  : "text-gray-400 hover:text-white font-bold"
              )}
            >
              Open Bets ({openBets.length})
            </button>
            <button
              type="button"
              onClick={() => setMainTab("history")}
              className={cn(
                "py-2.5 text-xs rounded-lg transition-all text-center",
                mainTab === "history"
                  ? "bg-white text-black shadow-md font-black"
                  : "text-gray-400 hover:text-white font-bold"
              )}
            >
              Bet History
            </button>
          </div>
        </div>
      </header>

      {/* ── 3. SUB-FILTER PILLS BAR & GRID ICON (Matches Screenshot) ── */}
      {mainTab === "open" && (
        <div className="bg-[#141720] border-b border-[#202735] py-2.5 px-3 md:px-5">
          <div className="mx-auto w-full max-w-5xl flex items-center justify-between">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setSubFilter("all")}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-black transition-all",
                  subFilter === "all"
                    ? "bg-[#525a6b] text-white shadow-xs"
                    : "bg-[#1c212c] text-gray-400 hover:text-white border border-[#273040]"
                )}
              >
                All
              </button>

              <button
                type="button"
                onClick={() => setSubFilter("cashout")}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                  subFilter === "cashout"
                    ? "bg-[#525a6b] text-white shadow-xs"
                    : "bg-[#1c212c] text-gray-400 hover:text-white border border-[#273040]"
                )}
              >
                Cashout Available
              </button>

              <button
                type="button"
                onClick={() => setSubFilter("live")}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                  subFilter === "live"
                    ? "bg-[#525a6b] text-white shadow-xs"
                    : "bg-[#1c212c] text-gray-400 hover:text-white border border-[#273040]"
                )}
              >
                Live Games
              </button>
            </div>

            {/* Right: Grid Layout Icon */}
            <button
              type="button"
              className="p-1.5 rounded-lg bg-[#1c212c] border border-[#273040] text-gray-400 hover:text-white"
              title="Change view layout"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── 4. MAIN BODY CONTENT ── */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-3 md:px-5 pt-3 space-y-3">
        {mainTab === "open" ? (
          openBets.length > 0 ? (
            /* ========================================================= */
            /* ONGOING MULTIPLE GAMES VIEW (Exact Match to User Screenshot) */
            /* ========================================================= */
            <div className="space-y-3">
              {/* Dismissible Banner: "Set a rule to Auto Cashout your bet. (i)" */}
              {showAutoCashoutBanner && (
                <div className="bg-[#181d26] border border-[#262f3e] rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-gray-300 shadow-sm animate-in fade-in-50">
                  <div className="flex items-center gap-1.5">
                    <span>
                      Set a rule to <strong className="text-white font-extrabold">Auto Cashout</strong> your bet.
                    </span>
                    <button
                      type="button"
                      onClick={() => setCashoutModalOpen(true)}
                      className="text-gray-400 hover:text-white"
                      title="Learn about Auto Cashout"
                    >
                      <Info className="h-3.5 w-3.5 ml-0.5 inline" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAutoCashoutBanner(false)}
                    className="text-gray-400 hover:text-white p-0.5 rounded transition-colors"
                    title="Dismiss"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Ongoing Bet Cards */}
              <div className="space-y-3">
                {filteredOpenBets.map((h) => {
                  const cashoutVal = Math.round(h.stake * 1.65);
                  const isAvailable = h.cashoutAvailable === true;
                  const isExpanded = !!expandedBetCodes[h.code];

                  return (
                    <div
                      key={h.code}
                      className="bg-[#181d26] border border-[#262f3e] rounded-xl p-4 space-y-3 shadow-md hover:border-[#333d4e] transition-all"
                    >
                      {/* Top Row: [ Multiple ] [ Live ] ... [ Rebet ] [ SIM ] [ Share ] */}
                      <div className="flex items-center justify-between">
                        <div
                          className="flex items-center gap-2 cursor-pointer"
                          onClick={() => toggleExpandBet(h.code)}
                        >
                          <span className="font-black text-sm text-white tracking-wide">
                            Multiple
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-[#15803d]/30 text-[#22c55e] border border-[#22c55e]/30">
                            Live
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleRebet(h)}
                            className="flex items-center gap-1 text-xs font-bold text-[#22c55e] hover:brightness-125 transition-all cursor-pointer"
                            title="Rebet selections"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>Rebet</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleShareBet(h)}
                            className="text-[#22c55e] hover:scale-110 transition-transform cursor-pointer"
                            title="Share Bet"
                          >
                            <Share2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* CONDITIONAL BODY: EXPANDED vs COLLAPSED */}
                      {isExpanded ? (
                        /* ── EXPANDED STATE (Exact Match to User Screenshot) ── */
                        <div className="space-y-3 pt-1">
                          {/* Match Legs List */}
                          <div className="divide-y divide-[#232a39] border-t border-[#232a39]">
                            {h.selections.map((s, idx) => (
                              <div key={idx} className="pt-3 pb-2.5 flex items-start gap-3">
                                {/* Left: Clock Icon in circle */}
                                <div className="h-5 w-5 rounded-full border border-gray-500/80 flex items-center justify-center shrink-0 mt-0.5">
                                  <Clock className="h-3 w-3 text-gray-300" />
                                </div>

                                <div className="flex-1 min-w-0 space-y-1">
                                  {/* Pick & Odds + Market */}
                                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                    <span className="text-sm">⚽</span>
                                    <span className="font-extrabold text-white">
                                      {s.optionLabel} @ {s.multiplier.toFixed(2)}
                                    </span>
                                    <span className="text-gray-400 font-medium">
                                      {s.marketName}
                                    </span>
                                  </div>

                                  {/* Match Teams (Underlined link style) */}
                                  <div className="text-xs text-gray-200 underline underline-offset-2 decoration-gray-500 font-semibold truncate hover:text-white cursor-pointer">
                                    {s.matchTitle || "Match Details"}
                                  </div>

                                  {/* Kickoff Date & Time */}
                                  <div className="text-[11px] text-gray-400 font-mono">
                                    {s.kickoffTime || "18/10 14:30"}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Hide Match Details link */}
                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => toggleExpandBet(h.code)}
                              className="text-xs text-gray-400 hover:text-white flex items-center gap-1 font-medium cursor-pointer"
                            >
                              <span>Hide Match Details</span>
                              <ChevronUp className="h-3.5 w-3.5 text-[#00e676]" />
                            </button>
                          </div>

                          {/* Stake & Pot. Win Summary */}
                          <div className="pt-2 border-t border-[#232a39] space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400 font-medium">Stake</span>
                              <span className="font-mono font-black text-white text-sm">
                                {h.stake.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400 font-medium">Pot. Win</span>
                              <span className="font-mono font-black text-white text-sm">
                                {(h.potWin || h.stake * 3.5).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Full-width Cashout Action Button */}
                          <div className="pt-2">
                            {isAvailable ? (
                              <button
                                type="button"
                                onClick={() => handleCashout(h.code, h.stake, h.selections.length)}
                                className="w-full bg-[#00a859] hover:bg-[#00914c] active:scale-98 text-white font-black text-sm py-3 rounded-lg shadow-md transition-all text-center cursor-pointer"
                              >
                                Cashout GHS {(h.cashoutValue || h.stake).toFixed(2)}
                              </button>
                            ) : (
                              <div className="space-y-1">
                                <button
                                  type="button"
                                  disabled
                                  className="w-full bg-[#313948] text-gray-300 font-black text-sm py-3 rounded-lg border border-[#3e485b] cursor-not-allowed text-center select-none"
                                >
                                  Cashout Unavailable
                                </button>
                                <p className="text-[10px] text-gray-400 font-medium text-center">
                                  Cashout is temporarily unavailable for this bet
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* ── COLLAPSED STATE ── */
                        <div className="space-y-2 pt-1">
                          <div
                            className="flex items-center justify-between gap-3 cursor-pointer"
                            onClick={() => toggleExpandBet(h.code)}
                          >
                            <div className="space-y-1">
                              <h4 className="text-sm md:text-base font-black text-white tracking-tight">
                                {h.matchTitle || "Udinese vs Lecce"}
                              </h4>
                              <p className="text-xs text-gray-400">
                                Stake{" "}
                                <strong className="text-white font-mono font-black text-sm ml-1">
                                  {h.stake.toFixed(2)}
                                </strong>
                              </p>
                            </div>

                            {/* Right: Cashout Status / Action Button */}
                            <div className="flex flex-col items-end shrink-0">
                              {isAvailable ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCashout(h.code, h.stake, h.selections.length);
                                  }}
                                  className="bg-[#00a859] hover:bg-[#00914c] active:scale-95 text-white font-black text-xs px-5 py-2 rounded-lg shadow-md text-center leading-tight min-w-[125px] transition-all"
                                >
                                  <div>Cash Out</div>
                                  <div className="font-mono font-black">
                                    {formatGHS(h.cashoutValue || cashoutVal)}
                                  </div>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled
                                  className="bg-[#313948] text-gray-300 font-bold text-xs px-5 py-2 rounded-lg border border-[#3e485b] text-center leading-tight min-w-[125px] cursor-not-allowed select-none"
                                >
                                  <div>Cashout</div>
                                  <div>Unavailable</div>
                                </button>
                              )}

                              <span className="text-[10px] text-gray-400 font-medium text-right mt-1">
                                {isAvailable
                                  ? "Cashout is available now!"
                                  : "Cashout is temporarily unavailable for this bet"}
                              </span>
                            </div>
                          </div>

                          {/* Show Match Details toggle link */}
                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => toggleExpandBet(h.code)}
                              className="text-xs text-gray-400 hover:text-white flex items-center gap-1 font-medium cursor-pointer"
                            >
                              <span>Show Match Details</span>
                              <ChevronDown className="h-3.5 w-3.5 text-[#00e676]" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Quick switch helper bar */}
              <div className="flex items-center justify-between pt-4 border-t border-[#202735] text-xs">
                <span className="text-gray-400">
                  Showing {filteredOpenBets.length} ongoing stakes
                </span>
              </div>
            </div>
          ) : (
            /* ========================================================= */
            /* EMPTY STATE: "WHEN THERE ARE NO ACTIVE BETS" (Screenshot match) */
            /* ========================================================= */
            <div className="w-full pb-10">
              {/* Graphic + Headline */}
              <div className="pt-6 pb-4 px-4 flex flex-col items-center justify-center text-center">
                <img
                  src="/empty-bets.png"
                  alt="No active bets"
                  className="h-28 w-28 md:h-32 md:w-32 object-contain drop-shadow-xs select-none"
                />
                <h2 className="mt-3 text-sm md:text-base font-black text-white tracking-tight">
                  No bets? No problem!
                </h2>
                <p className="mt-0.5 text-xs text-gray-400 font-semibold">
                  Get started with popular codes!
                </p>
              </div>


              {/* Recommended Football Codes Accordion Section */}
              <div className="w-full space-y-3">
                <button
                  type="button"
                  onClick={() => setCodesAccordionOpen(!codesAccordionOpen)}
                  className="w-full bg-[#181d26] border border-[#262f3e] rounded-xl px-3.5 py-3 flex items-center justify-between shadow-2xs hover:bg-[#1f2634] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Bookmark className="h-4 w-4 fill-[#00a859] text-[#00a859]" />
                    <span className="text-sm font-black text-white tracking-tight">
                      Recommended Football Codes
                    </span>
                  </div>
                  {codesAccordionOpen ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </button>

                {codesAccordionOpen && (
                  <div className="space-y-3">
                    {communitySlips.length === 0 ? (
                      <div className="bg-[#181d26] rounded-xl border border-[#262f3e] p-6 text-center space-y-2">
                        <Bookmark className="h-7 w-7 text-gray-500 mx-auto opacity-40" />
                        <p className="text-xs font-bold text-gray-300">No community shared slips yet</p>
                        <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
                          Place a bet on any live or scheduled match to create your custom booking code and share it here!
                        </p>
                        <div className="pt-2">
                          <Link
                            to="/matches"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00a859] hover:bg-[#00914c] text-white text-xs font-black transition-all shadow-xs"
                          >
                            Browse Matches
                          </Link>
                        </div>
                      </div>
                    ) : (
                      communitySlips.map((code) => {
                        const folds = code.selections?.length || 0;
                        const totalOdds = (code.selections || []).reduce((acc, s) => acc * s.multiplier, 1).toFixed(2);
                        const displayedMatches = (code.selections || []).slice(0, 4);

                        return (
                          <div
                            key={code.code}
                            className="bg-[#181d26] rounded-xl border border-[#262f3e] overflow-hidden shadow-2xs"
                          >
                            {/* Card Header Bar (Light mint green) */}
                            <div className="bg-[#eef8f2] px-3.5 py-2.5 flex items-center justify-between border-b border-[#ddede2]">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-black text-gray-900 tracking-wide">
                                  {code.code}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyCode(code.code)}
                                  title="Copy booking code"
                                  className="inline-flex items-center gap-1 text-[#00a859] text-xs font-black bg-white/90 border border-[#bce8cb] px-2 py-0.5 rounded shadow-2xs hover:bg-white active:scale-95 transition-all"
                                >
                                  {copiedCode === code.code ? (
                                    <Check className="h-3 w-3" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                  <span>Copy</span>
                                </button>
                              </div>

                              <div className="flex items-center text-xs">
                                <span className="text-gray-500">
                                  Folds: <strong className="text-gray-900 font-extrabold">{folds}</strong>
                                </span>
                                <span className="text-gray-500 ml-3">
                                  Odds:{" "}
                                  <strong className="text-gray-900 font-mono font-black">
                                    {totalOdds}
                                  </strong>
                                </span>
                              </div>
                            </div>

                            {/* Selections / Matches preview */}
                            <div className="divide-y divide-gray-100 bg-white">
                              {displayedMatches.map((m) => (
                                <div
                                  key={m.matchId + m.optionId}
                                  className="px-3.5 py-2.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                                >
                                  <div className="min-w-0 pr-2">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 truncate">
                                      <span className="font-extrabold text-gray-900">
                                        {m.optionLabel} @{m.multiplier.toFixed(2)}
                                      </span>
                                      <span className="text-gray-400 font-normal">|</span>
                                      <span className="text-gray-500 font-semibold">{m.marketName}</span>
                                    </div>
                                    <div className="text-[11px] text-gray-500 truncate">
                                      Match ID: {m.matchId}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Card Footer Actions: Share | Add to Betslip */}
                            <div className="border-t border-gray-100 flex items-center justify-between bg-white">
                              <button
                                type="button"
                                onClick={() => handleShareCode(code)}
                                className="flex items-center gap-1.5 text-xs font-extrabold text-[#00a859] px-4 py-2.5 hover:bg-[#f0fdf4] transition-colors"
                              >
                                <Share2 className="h-3.5 w-3.5" />
                                <span>Share</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleAddToBetslip(code)}
                                className="bg-[#00a859] hover:bg-[#00914c] active:scale-95 text-white font-black text-xs px-6 py-2.5 transition-all shadow-xs"
                              >
                                Add to Betslip
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        ) : (
          /* ========================================================= */
          /* BET HISTORY VIEW — Exact Match to User Screenshot */
          /* ========================================================= */
          <div className="space-y-4 pb-6">
            {/* Filter Bar: [ Bet Status: Settled ∨ ] [ Bet Result ∨ ] ... [ 📅 ] [ 🗑️ ] */}
            <div className="flex items-center gap-2 py-1">
              {/* Bet Status Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setHistoryStatusOpen((v) => !v);
                    setHistoryResultOpen(false);
                  }}
                  className="flex items-center gap-1.5 bg-[#17281e] border border-[#234e32] rounded-md px-3 py-1.5 text-xs font-bold text-[#00E676] hover:bg-[#1d3527] transition-colors"
                >
                  <span className="font-semibold text-gray-300">Bet Status:</span>
                  <span className="text-[#00E676] ml-0.5">{historyStatusFilter}</span>
                  <ChevronDown className="h-3 w-3 ml-0.5 text-[#00E676]" />
                </button>
                {historyStatusOpen && (
                  <div className="absolute top-full mt-1 left-0 z-30 bg-[#1e2736] border border-[#2a3347] rounded-lg overflow-hidden shadow-xl min-w-[130px]">
                    {(["Settled", "All", "Won", "Lost", "Running"] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setHistoryStatusFilter(opt);
                          setHistoryStatusOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-xs font-bold transition-colors hover:bg-[#2a3347]",
                          historyStatusFilter === opt ? "text-[#00E676]" : "text-gray-200",
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Bet Result Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setHistoryResultOpen((v) => !v);
                    setHistoryStatusOpen(false);
                  }}
                  className="flex items-center gap-1.5 bg-[#1a212d] border border-[#2b3548] rounded-md px-3 py-1.5 text-xs font-bold text-gray-200 hover:bg-[#222938] transition-colors"
                >
                  <span>Bet Result</span>
                  {historyResultFilter !== "All" && (
                    <span className="text-[#00E676] ml-0.5">: {historyResultFilter}</span>
                  )}
                  <ChevronDown className="h-3 w-3 ml-0.5 text-gray-400" />
                </button>
                {historyResultOpen && (
                  <div className="absolute top-full mt-1 left-0 z-30 bg-[#1e2736] border border-[#2a3347] rounded-lg overflow-hidden shadow-xl min-w-[110px]">
                    {(["All", "Won", "Lost"] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setHistoryResultFilter(opt);
                          setHistoryResultOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-xs font-bold transition-colors hover:bg-[#2a3347]",
                          historyResultFilter === opt ? "text-[#00E676]" : "text-gray-200",
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Active date filter badge */}
              {historyDateFilter && (
                <button
                  type="button"
                  onClick={() => setHistoryDateFilter("")}
                  className="flex items-center gap-1 text-[10px] font-bold bg-[#1a3a28] text-[#00E676] border border-[#00E676]/30 px-2 py-1 rounded-md hover:bg-red-900/30 hover:text-red-400 hover:border-red-800/40 transition-colors"
                  title="Clear date filter"
                >
                  {new Date(historyDateFilter + "T00:00:00").toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    timeZone: GHANA_TZ,
                  })}
                  <X className="h-2.5 w-2.5" />
                </button>
              )}

              {/* Calendar Icon + inline date picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setHistoryCalendarOpen((v) => !v)}
                  className={cn(
                    "p-1.5 rounded-md border transition-colors cursor-pointer",
                    historyCalendarOpen || historyDateFilter
                      ? "bg-[#1a3a28] border-[#00E676]/40 text-[#00E676]"
                      : "bg-[#1a212d] border-[#2a3347] text-gray-400 hover:text-white",
                  )}
                  title="Filter by date"
                >
                  <CalendarDays className="h-4 w-4" />
                </button>
                {historyCalendarOpen && (
                  <div className="absolute top-full right-0 mt-1 z-30 bg-[#1e2736] border border-[#2a3347] rounded-xl p-3 shadow-xl min-w-[200px]">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                      Filter by date
                    </p>
                    <input
                      type="date"
                      value={historyDateFilter}
                      onChange={(e) => {
                        setHistoryDateFilter(e.target.value);
                        setHistoryCalendarOpen(false);
                      }}
                      max={new Date().toISOString().slice(0, 10)}
                      className="w-full bg-[#12161f] border border-[#2a3347] rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#00E676] transition-colors"
                    />
                    {historyDateFilter && (
                      <button
                        type="button"
                        onClick={() => {
                          setHistoryDateFilter("");
                          setHistoryCalendarOpen(false);
                        }}
                        className="mt-2 w-full text-[10px] font-bold text-red-400 hover:text-red-300 py-1 transition-colors cursor-pointer"
                      >
                        Clear date filter
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Reset/Clear Icon (🗑️ Trash2) */}
              <button
                type="button"
                onClick={() => {
                  setHistoryStatusFilter("Settled");
                  setHistoryResultFilter("Won");
                  setHistoryDateFilter("");
                  toast.info("Filters reset to default.");
                }}
                className="p-1.5 rounded-md border border-[#2a3347] bg-[#1a212d] text-gray-400 hover:text-white transition-colors cursor-pointer"
                title="Reset all filters"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Empty state */}
            {filteredSettledBets.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-[#222938] bg-[#141822] space-y-3">
                <div className="h-12 w-12 rounded-full bg-[#172b20] border border-[#22c55e]/30 flex items-center justify-center mx-auto text-[#00E676]">
                  <Trophy className="h-6 w-6 text-[#00E676]/70" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-200">No Won Tickets Yet</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                    When your placed bets win, your won tickets will appear here with your payout returns and winning celebration trophy.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    to="/matches"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#00a859] hover:bg-[#00914c] text-white text-xs font-black transition-all active:scale-95 shadow-sm"
                  >
                    Browse Matches
                  </Link>
                </div>
              </div>
            ) : (
              /* Grouped Date Timeline Layout (Exact Match to User Screenshot) */
              <div className="space-y-6">
                {groupedSettledBets.map((group) => (
                  <div key={group.dateKey} className="flex items-start gap-2.5 sm:gap-4">
                    {/* Left Date Column: e.g. "20 \n Oct" */}
                    <div className="w-9 sm:w-12 shrink-0 pt-1 text-center select-none">
                      <span className="block text-xl sm:text-2xl font-black text-gray-300 leading-none">
                        {group.day}
                      </span>
                      <span className="block text-[11px] font-bold text-gray-500 uppercase mt-1 tracking-tight">
                        {group.mon}
                      </span>
                    </div>

                    {/* Right: Stack of bet cards for this date */}
                    <div className="flex-1 min-w-0 space-y-3">
                      {group.bets.map((h) => {
                        const isWon = h.status === "WON";
                        const isRunning = h.status === "PENDING";
                        const matchPreviews = h.selections
                          .slice(0, 3)
                          .map((s) => s.matchTitle || "Match");
                        const remaining = h.selections.length - 3;
                        const isExpanded = !!expandedHistoryIds[h.code];

                        return (
                          <div
                            key={h.code}
                            onClick={() => setSelectedTicketForDetails(h)}
                            className="rounded-xl border border-[#222938] bg-[#141822] overflow-hidden shadow-md hover:border-[#2f394c] transition-all cursor-pointer group"
                            title="Tap to view full Ticket Details"
                          >
                            {/* Card Header Banner (Solid Green for Won - Matches Screenshot) */}
                            {isWon ? (
                              <div className="bg-[#00a859] px-3.5 py-2.5 flex items-center justify-between text-white shadow-xs group-hover:brightness-105 transition-all">
                                <span className="font-extrabold text-sm tracking-wide">
                                  {h.selections.length > 1 ? "Multiple" : "Single"}
                                </span>
                                <div
                                  className="flex items-center gap-1.5 text-xs font-black text-white hover:brightness-110 active:scale-95 transition-all py-0.5 px-1.5 rounded hover:bg-black/10"
                                >
                                  <Trophy className="h-3.5 w-3.5 text-white" />
                                  <span>Won</span>
                                  <ChevronRight className="h-4 w-4 stroke-[3]" />
                                </div>
                              </div>
                            ) : isRunning ? (
                              <div className="bg-[#172b20] border-b border-[#22c55e]/30 px-3.5 py-2.5 flex items-center justify-between text-white">
                                <span className="font-extrabold text-sm text-gray-200">
                                  {h.selections.length > 1 ? "Multiple" : "Single"}
                                </span>
                                <span className="flex items-center gap-1 text-xs font-bold text-[#22c55e]">
                                  Running <ChevronRight className="h-4 w-4 stroke-[2.5]" />
                                </span>
                              </div>
                            ) : (
                              <div className="bg-[#24171a] border-b border-red-900/30 px-3.5 py-2.5 flex items-center justify-between text-white">
                                <span className="font-extrabold text-sm text-gray-200">
                                  {h.selections.length > 1 ? "Multiple" : "Single"}
                                </span>
                                <span className="flex items-center gap-1 text-xs font-bold text-red-400">
                                  Lost <ChevronRight className="h-4 w-4 stroke-[2.5]" />
                                </span>
                              </div>
                            )}

                            {/* Card Body */}
                            <div className="p-3.5 sm:p-4 space-y-2">
                              {/* Row 1: Total Stake(GHS) */}
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-400 font-semibold tracking-wide">
                                  Total Stake(GHS)
                                </span>
                                <span className="font-mono font-bold text-white text-xs sm:text-sm">
                                  {h.stake.toFixed(2)}
                                </span>
                              </div>

                              {/* Row 2: Total Return (Matches Screenshot large bold green) */}
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-400 font-semibold tracking-wide">
                                  Total Return
                                </span>
                                <span
                                  className={cn(
                                    "font-mono font-black text-base sm:text-lg tabular-nums tracking-tight",
                                    isWon
                                      ? "text-[#00E676] drop-shadow-[0_0_8px_rgba(0,230,118,0.25)]"
                                      : "text-gray-400",
                                  )}
                                >
                                  {isWon
                                    ? h.payout.toLocaleString("en-US", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })
                                    : isRunning
                                      ? "--"
                                      : "0.00"}
                                </span>
                              </div>

                              {/* Row 3: Matches Preview + Remix Bet Button (Matches Screenshot) */}
                              <div className="pt-2 border-t border-[#1e2535] flex items-end justify-between gap-3">
                                <div
                                  onClick={() => toggleHistoryExpand(h.code)}
                                  className="space-y-0.5 text-xs text-gray-300 font-medium min-w-0 flex-1 cursor-pointer"
                                >
                                  {matchPreviews.map((title, idx) => (
                                    <p key={idx} className="truncate hover:text-white transition-colors">
                                      {title}
                                    </p>
                                  ))}
                                  {remaining > 0 && (
                                    <span className="text-[11px] text-[#00E676] font-bold hover:underline inline-block mt-0.5">
                                      {isExpanded
                                        ? "Hide extra matches"
                                        : `...and ${remaining} other match${remaining > 1 ? "es" : ""}`}
                                    </span>
                                  )}
                                </div>

                                {/* Remix Bet Button (Exact Match) */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditBet(h);
                                  }}
                                  className="shrink-0 bg-[#00a859] hover:bg-[#00914c] active:scale-95 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-md transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                                  title="Load selections into betslip to remix and place again"
                                >
                                  <span>Remix Bet</span>
                                </button>
                              </div>

                              {/* Expanded Legs Accordion */}
                              {isExpanded && (
                                <div className="pt-2 border-t border-[#1e2535] space-y-2 animate-in fade-in-50 duration-200">
                                  <div className="divide-y divide-[#1c2230] rounded-lg bg-[#0f1218] p-2.5 border border-[#1f2637]">
                                    {h.selections.map((s, idx) => (
                                      <div
                                        key={idx}
                                        className="py-2 first:pt-0 last:pb-0 flex items-start justify-between gap-2 text-xs"
                                      >
                                        <div className="min-w-0 space-y-0.5">
                                          <div className="flex items-center gap-1.5 text-gray-200 font-semibold truncate">
                                            <span className="text-emerald-400">✓</span>
                                            <span className="truncate">{s.matchTitle}</span>
                                          </div>
                                          <div className="text-[11px] text-gray-400 pl-4">
                                            <span>Pick: </span>
                                            <strong className="text-white">{s.optionLabel}</strong>
                                            <span className="text-gray-500"> ({s.marketName})</span>
                                          </div>
                                        </div>
                                        <span className="font-mono font-bold text-[#00E676] shrink-0 text-xs bg-[#00E676]/10 px-1.5 py-0.5 rounded border border-[#00E676]/20">
                                          @{s.multiplier.toFixed(2)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer note */}
            {filteredSettledBets.length > 0 && (
              <p className="text-center text-[11px] text-gray-500 py-3">
                Showing only tickets in the last 4 months
              </p>
            )}
          </div>
        )}
      </main>

      {/* Cashout rules modal */}
      <HowToCashoutModal open={cashoutModalOpen} onOpenChange={setCashoutModalOpen} />

      {/* Payment Deposit Gateway modal */}
      <PaymentGatewayModal open={depositModalOpen} onOpenChange={setDepositModalOpen} />

      {/* Full-Screen Ticket Details Modal matching attached user media */}
      <TicketDetailsModal
        isOpen={!!selectedTicketForDetails}
        onClose={() => setSelectedTicketForDetails(null)}
        ticket={selectedTicketForDetails}
        onShowOff={(t) => {
          showWinningCup({
            code: t.code,
            payout: t.payout,
            potWin: t.potWin ?? t.payout,
            matchTitle: t.matchTitle,
            selections: t.selections,
            stake: t.stake,
          });
        }}
        onRemixBet={(t) => handleEditBet(t)}
        onDeleteTicket={(code) => {
          setDeletedTicketCodes((prev) => ({ ...prev, [code]: true }));
        }}
      />
    </div>
  );
}
