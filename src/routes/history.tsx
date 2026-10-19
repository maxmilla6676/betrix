import { useState, useMemo } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatGHS, useBetrix, selectionMatch, type Selection, type HistoryEntry } from "@/store/betrix";
import { teamById } from "@/data/football";
import { cn } from "@/lib/utils";
import { GHANA_TZ } from "@/lib/ghana-time";
import { HowToCashoutModal } from "@/components/common/HowToCashoutModal";
import { PaymentGatewayModal } from "@/components/payment/PaymentGatewayModal";
import {
  recommendedFootballCodes,
  type RecommendedCode,
} from "@/data/recommendedCodes";

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
    deposit,
    balance,
    loadSlip,
    clearAllOpenBets,
    loadDemoOngoingBets,
    toggleCashoutAvailable,
  } = useBetrix();

  // Top Tabs: 'open' | 'history'
  const [mainTab, setMainTab] = useState<"open" | "history">("open");

  // Sub-filters under Open Bets: 'all' | 'cashout' | 'live'
  const [subFilter, setSubFilter] = useState<"all" | "cashout" | "live">("all");

  // History tab filters
  const [historyStatusFilter, setHistoryStatusFilter] = useState<"All" | "Won" | "Lost" | "Running">("All");
  const [historyResultFilter, setHistoryResultFilter] = useState<"All" | "Won" | "Lost">("All");
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

  const [cashedOutCodes, setCashedOutCodes] = useState<Record<string, number>>({});
  const [codesAccordionOpen, setCodesAccordionOpen] = useState(true);
  const [expandedCodeIds, setExpandedCodeIds] = useState<Record<string, boolean>>({});
  const [cashoutModalOpen, setCashoutModalOpen] = useState(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showAutoCashoutBanner, setShowAutoCashoutBanner] = useState(true);
  // Track which ongoing bets are expanded to show match details (default BTX-ACC4 open as in screenshot)
  const [expandedBetCodes, setExpandedBetCodes] = useState<Record<string, boolean>>({
    "BTX-ACC4": true,
  });

  const toggleExpandBet = (code: string) => {
    setExpandedBetCodes((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  // Open Bets list (status === 'PENDING' and not cashed out)
  const openBets = useMemo(() => {
    return history.filter((h) => h.status === "PENDING" && !cashedOutCodes[h.code]);
  }, [history, cashedOutCodes]);

  // Settled History list (status !== 'PENDING' or cashed out)
  const settledBets = useMemo(() => {
    return history.filter((h) => h.status !== "PENDING" || !!cashedOutCodes[h.code]);
  }, [history, cashedOutCodes]);

  // Filtered settled bets — applies status, result, and date filters
  const filteredSettledBets = useMemo(() => {
    return settledBets.filter((h) => {
      // Status filter
      if (historyStatusFilter === "Running" && h.status !== "PENDING") return false;
      if (historyStatusFilter === "Won" && h.status !== "WON") return false;
      if (historyStatusFilter === "Lost" && h.status !== "LOST") return false;

      // Result filter (overlaps with status for settled bets)
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

  const handleCashout = (code: string, stake: number, selectionsCount: number) => {
    const cashoutValue = Math.round(stake * (1.35 + selectionsCount * 0.4));
    setCashedOutCodes((prev) => ({ ...prev, [code]: cashoutValue }));
    deposit(cashoutValue);
    toast.success(`Bet ${code} cashed out for +${formatGHS(cashoutValue)}!`);
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

  const handleSimulateBet = (code: string) => {
    toggleCashoutAvailable(code);
    toast.info(`Toggled cashout availability for ${code}!`);
  };

  const handleShareCode = (codeObj: RecommendedCode) => {
    const text = `Check out this BETRIX football booking code: ${codeObj.code} (${codeObj.folds} folds, Odds: ${codeObj.oddsDisplay})! Load it on BETRIX to win!`;
    if (navigator.share) {
      navigator.share({ title: `BETRIX Code: ${codeObj.code}`, text }).catch(() => {});
    } else {
      void navigator.clipboard.writeText(text);
      toast.success(`Booking code ${codeObj.code} copied! Share it with friends.`);
    }
  };

  const handleAddToBetslip = (codeObj: RecommendedCode) => {
    loadSlip(codeObj.selections);
    toast.success(`Loaded ${codeObj.folds} selections from code ${codeObj.code} into betslip!`);
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

        {/* ── 2. MAIN SEGMENTED TABS: [ Open Bets (N) ] [ Bet History ] ── */}
        <div className="mx-auto w-full max-w-5xl px-3 md:px-5 pb-3">
          <div className="grid grid-cols-2 gap-2 bg-[#12161f] p-1 rounded-xl border border-[#202633]">
            <button
              type="button"
              onClick={() => setMainTab("open")}
              className={cn(
                "py-2 text-xs rounded-lg transition-all text-center",
                mainTab === "open"
                  ? "bg-[#1a212d] text-white shadow-sm font-black border border-[#2b3548]"
                  : "text-gray-400 hover:text-gray-200 font-bold"
              )}
            >
              Open Bets ({openBets.length})
            </button>
            <button
              type="button"
              onClick={() => setMainTab("history")}
              className={cn(
                "py-2 text-xs rounded-lg transition-all text-center",
                mainTab === "history"
                  ? "bg-[#1a212d] text-white shadow-sm font-black border border-[#2b3548]"
                  : "text-gray-400 hover:text-gray-200 font-bold"
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
                            onClick={() => handleSimulateBet(h.code)}
                            className="flex items-center gap-1 text-xs font-bold text-[#22c55e] hover:brightness-125 transition-all cursor-pointer"
                            title="Toggle Cashout Available / Unavailable"
                          >
                            <CornerUpRight className="h-3 w-3" />
                            <span>SIM</span>
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
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearAllOpenBets}
                    className="h-7 text-[11px] font-bold border-[#273040] bg-[#181d26] text-gray-300 hover:text-white hover:bg-[#222938]"
                  >
                    Clear Bets (View Empty State)
                  </Button>
                </div>
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

                {/* Quick switch to reload ongoing bets screenshot */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={loadDemoOngoingBets}
                  className="mt-3 h-7 text-[11px] font-bold border-[#273040] bg-[#181d26] text-[#22c55e] hover:bg-[#222938]"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Load Ongoing Bets (Screenshot Demo)
                </Button>
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
                    {recommendedFootballCodes.map((code) => {
                      const displayedMatches = code.matches.slice(0, 4);

                      return (
                        <div
                          key={code.id}
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
                                <span>{code.sharesCount}</span>
                              </button>
                            </div>

                            <div className="flex items-center text-xs">
                              <span className="text-gray-500">
                                Folds: <strong className="text-gray-900 font-extrabold">{code.folds}</strong>
                              </span>
                              <span className="text-gray-500 ml-3">
                                Odds:{" "}
                                <strong className="text-gray-900 font-mono font-black">
                                  {code.oddsDisplay}
                                </strong>
                              </span>
                            </div>
                          </div>

                          {/* Optional Promo Banner (e.g. 1UP or 2UP rewards early) */}
                          {code.promoBadge && (
                            <div className="bg-[#f0fdf4] border-b border-[#dcfce7] px-3.5 py-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#15803d]">
                              <ShieldCheck className="h-3.5 w-3.5 text-[#00a859] shrink-0" />
                              <span>{code.promoBadge}</span>
                            </div>
                          )}

                          {/* Selections / Matches preview */}
                          <div className="divide-y divide-gray-100 bg-white">
                            {displayedMatches.map((m) => (
                              <div
                                key={m.id}
                                className="px-3.5 py-2.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                              >
                                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                  <div
                                    className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0 shadow-2xs"
                                    style={{ backgroundColor: m.leagueColor }}
                                  >
                                    {m.leagueShort}
                                  </div>

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 truncate">
                                      <span className="font-extrabold text-gray-900">
                                        {m.pickLabel} @{m.pickMultiplier.toFixed(2)}
                                      </span>
                                      <span className="text-gray-400 font-normal">|</span>
                                      <span className="text-gray-500 font-semibold">{m.marketName}</span>
                                    </div>
                                    <div className="text-[11px] text-gray-500 truncate">
                                      {m.homeTeam} vs {m.awayTeam}
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <BarChart2 className="h-3.5 w-3.5 text-gray-400 ml-auto" />
                                  <div className="text-[10px] text-gray-400 mt-0.5">{m.kickoffTime}</div>
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
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        ) : (
          /* ========================================================= */
          /* BET HISTORY VIEW — Matches Reference Screenshot */
          /* ========================================================= */
          <div className="space-y-3 pb-4">
            {/* Filter Bar: Bet Status | Bet Result | Calendar icon */}
            <div className="flex items-center gap-2 py-1">
              {/* Bet Status Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setHistoryStatusOpen(v => !v); setHistoryResultOpen(false); }}
                  className="flex items-center gap-1 bg-[#1a212d] border border-[#2a3347] rounded-md px-3 py-1.5 text-xs font-bold text-gray-200 hover:bg-[#222938] transition-colors"
                >
                  <span className="text-gray-400 font-semibold">Bet Status:</span>
                  <span className="text-white ml-1">{historyStatusFilter}</span>
                  <ChevronDown className="h-3 w-3 ml-1 text-gray-400" />
                </button>
                {historyStatusOpen && (
                  <div className="absolute top-full mt-1 left-0 z-30 bg-[#1e2736] border border-[#2a3347] rounded-lg overflow-hidden shadow-xl min-w-[130px]">
                    {(["All", "Running", "Won", "Lost"] as const).map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => { setHistoryStatusFilter(opt); setHistoryStatusOpen(false); }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-xs font-bold transition-colors hover:bg-[#2a3347]",
                          historyStatusFilter === opt ? "text-[#22c55e]" : "text-gray-200"
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
                  onClick={() => { setHistoryResultOpen(v => !v); setHistoryStatusOpen(false); }}
                  className="flex items-center gap-1 bg-[#1a212d] border border-[#2a3347] rounded-md px-3 py-1.5 text-xs font-bold text-gray-200 hover:bg-[#222938] transition-colors"
                >
                  <span className="text-white">Bet Result</span>
                  <ChevronDown className="h-3 w-3 ml-1 text-gray-400" />
                </button>
                {historyResultOpen && (
                  <div className="absolute top-full mt-1 left-0 z-30 bg-[#1e2736] border border-[#2a3347] rounded-lg overflow-hidden shadow-xl min-w-[110px]">
                    {(["All", "Won", "Lost"] as const).map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => { setHistoryResultFilter(opt); setHistoryResultOpen(false); }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-xs font-bold transition-colors hover:bg-[#2a3347]",
                          historyResultFilter === opt ? "text-[#22c55e]" : "text-gray-200"
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

              {/* Active date badge */}
              {historyDateFilter && (
                <button
                  type="button"
                  onClick={() => setHistoryDateFilter("")}
                  className="flex items-center gap-1 text-[10px] font-bold bg-[#1a3a28] text-[#22c55e] border border-[#22c55e]/30 px-2 py-1 rounded-md hover:bg-red-900/30 hover:text-red-400 hover:border-red-800/40 transition-colors"
                  title="Clear date filter"
                >
                  {new Date(historyDateFilter + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: GHANA_TZ })}
                  <X className="h-2.5 w-2.5" />
                </button>
              )}

              {/* Calendar Icon + inline date picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setHistoryCalendarOpen(v => !v)}
                  className={cn(
                    "p-1.5 rounded-md border transition-colors",
                    historyCalendarOpen || historyDateFilter
                      ? "bg-[#1a3a28] border-[#22c55e]/40 text-[#22c55e]"
                      : "bg-[#1a212d] border-[#2a3347] text-gray-400 hover:text-white"
                  )}
                  title="Filter by date"
                >
                  <CalendarDays className="h-4 w-4" />
                </button>
                {historyCalendarOpen && (
                  <div className="absolute top-full right-0 mt-1 z-30 bg-[#1e2736] border border-[#2a3347] rounded-xl p-3 shadow-xl min-w-[200px]">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Filter by date</p>
                    <input
                      type="date"
                      value={historyDateFilter}
                      onChange={(e) => {
                        setHistoryDateFilter(e.target.value);
                        setHistoryCalendarOpen(false);
                      }}
                      max={new Date().toISOString().slice(0, 10)}
                      className="w-full bg-[#12161f] border border-[#2a3347] rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#22c55e] transition-colors"
                    />
                    {historyDateFilter && (
                      <button
                        type="button"
                        onClick={() => { setHistoryDateFilter(""); setHistoryCalendarOpen(false); }}
                        className="mt-2 w-full text-[10px] font-bold text-red-400 hover:text-red-300 py-1 transition-colors"
                      >
                        Clear date filter
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Result count */}
            {settledBets.length > 0 && (
              <p className="text-[11px] text-gray-500 font-semibold">
                {filteredSettledBets.length === settledBets.length
                  ? `${settledBets.length} bet${settledBets.length !== 1 ? "s" : ""}`
                  : `${filteredSettledBets.length} of ${settledBets.length} bet${settledBets.length !== 1 ? "s" : ""}`}
              </p>
            )}

            {/* Bets list */}
            {settledBets.length === 0 ? (
              <div className="p-10 text-center rounded-xl border border-[#262f3e] bg-[#181d26]">
                <CalendarDays className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                <p className="text-sm font-bold text-gray-300">No bet history yet</p>
                <p className="text-xs text-gray-500 mt-1">Your settled bets will appear here</p>
              </div>
            ) : filteredSettledBets.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-[#262f3e] bg-[#181d26]">
                <p className="text-sm font-bold text-gray-300">No bets match your filters</p>
                <button
                  type="button"
                  onClick={() => { setHistoryStatusFilter("All"); setHistoryResultFilter("All"); setHistoryDateFilter(""); }}
                  className="mt-2 text-xs font-bold text-[#22c55e] hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="space-y-0 divide-y divide-[#1e2535]">
                {filteredSettledBets.map((h) => {
                  // Parse date for the left date column
                  const dateObj = new Date(h.createdAt);
                  const day = dateObj.toLocaleDateString("en-GB", { day: "numeric", timeZone: GHANA_TZ });
                  const mon = dateObj.toLocaleDateString("en-US", { month: "short", timeZone: GHANA_TZ });

                  // Matches preview: show up to 3, then "...(and N other matches)"
                  const matchPreviews = h.selections.slice(0, 3).map(s => s.matchTitle || "Match");
                  const remaining = h.selections.length - 3;

                  const isRunning = h.status === "PENDING";
                  const isWon = h.status === "WON";

                  return (
                    <div
                      key={h.code}
                      className="flex items-stretch gap-0 bg-[#101319] first:rounded-t-xl last:rounded-b-xl border-x border-[#1e2535] first:border-t last:border-b overflow-hidden"
                    >
                      {/* Left Date Column */}
                      <div className="w-12 shrink-0 bg-[#141720] flex flex-col items-center justify-center py-4 gap-0.5 border-r border-[#1e2535]">
                        <span className="text-sm font-black text-white leading-none">{day}</span>
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{mon}</span>
                      </div>

                      {/* Main Card Body */}
                      <div className="flex-1 min-w-0 px-3 py-3 space-y-2">
                        {/* Row 1: Multiple badge + Running badge + chevron */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-white">Multiple</span>
                            <button
                              type="button"
                              onClick={() => toggleHistoryExpand(h.code)}
                              className={cn(
                                "flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded transition-colors",
                                isRunning
                                  ? "bg-[#1a3a28] text-[#22c55e] border border-[#22c55e]/30 hover:bg-[#1f4530]"
                                  : isWon
                                  ? "bg-[#1a3a28] text-[#22c55e] border border-[#22c55e]/30"
                                  : "bg-[#3a1a1a] text-red-400 border border-red-800/40"
                              )}
                            >
                              {isRunning ? "Running" : isWon ? "Won" : "Lost"}
                              <ChevronDown className="h-3 w-3 ml-0.5" />
                            </button>
                          </div>

                          {/* Edit Bet */}
                          <button
                            type="button"
                            onClick={() => handleEditBet(h)}
                            className="flex items-center gap-1 text-[11px] font-bold text-[#22c55e] hover:brightness-125 active:scale-95 transition-all cursor-pointer"
                            title="Load selections into betslip to place again"
                          >
                            <Pencil className="h-3 w-3" />
                            <span>Edit Bet</span>
                          </button>
                        </div>

                        {/* Row 2: Total Stake | Total Return */}
                        <div className="flex items-center gap-4 text-xs">
                          <div>
                            <span className="text-gray-400 font-semibold">Total Stake(GHS)</span>
                            <div className="font-black text-white text-sm mt-0.5">{h.stake.toFixed(2)}</div>
                          </div>
                          <div>
                            <span className="text-gray-400 font-semibold">Total Return</span>
                            <div className="font-black text-white text-sm mt-0.5">
                              {isRunning ? "--" : isWon ? formatGHS(h.payout) : "--"}
                            </div>
                          </div>
                        </div>

                        {/* Row 3: Match list */}
                        <div className="space-y-0.5 pt-0.5">
                          {matchPreviews.map((title, idx) => (
                            <p key={idx} className="text-xs text-gray-300 font-semibold leading-snug truncate">
                              {title}
                            </p>
                          ))}
                          {remaining > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleHistoryExpand(h.code)}
                              className="text-[11px] text-[#22c55e] font-bold hover:underline"
                            >
                              ...(and {remaining} other match{remaining > 1 ? "es" : ""})
                            </button>
                          )}
                        </div>

                        {/* Expanded match details */}
                        {expandedHistoryIds[h.code] && (
                          <div className="pt-2 border-t border-[#1e2535] space-y-1.5">
                            {h.selections.slice(3).map((s, idx) => (
                              <p key={idx} className="text-xs text-gray-300 font-semibold truncate">
                                {s.matchTitle || "Match"}
                              </p>
                            ))}
                            <button
                              type="button"
                              onClick={() => toggleHistoryExpand(h.code)}
                              className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 mt-1"
                            >
                              <ChevronUp className="h-3 w-3" />
                              <span>Show less</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer note */}
            {filteredSettledBets.length > 0 && (
              <p className="text-center text-[11px] text-gray-500 py-2">
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
    </div>
  );
}
