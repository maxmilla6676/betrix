import React from "react";
import {
  ChevronLeft,
  Headphones,
  Home,
  Check,
  TrendingUp,
  Trophy,
  Sparkles,
  Share2,
  Trash2,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { formatGHS, type HistoryEntry } from "@/store/betrix";
import { GHANA_TZ } from "@/lib/ghana-time";
import { cn } from "@/lib/utils";

export interface TicketDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: HistoryEntry | null;
  onShowOff: (ticket: HistoryEntry) => void;
  onRemixBet: (ticket: HistoryEntry) => void;
  onDeleteTicket?: ((code: string) => void) | undefined;
}

export function TicketDetailsModal({
  isOpen,
  onClose,
  ticket,
  onShowOff,
  onRemixBet,
  onDeleteTicket,
}: TicketDetailsModalProps) {
  const navigate = useNavigate();

  if (!isOpen || !ticket) return null;

  // Format date and time of ticket creation
  const createdDate = new Date(ticket.createdAt);
  const validDate = !isNaN(createdDate.getTime());
  const dateFormatted = validDate
    ? createdDate.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        timeZone: GHANA_TZ,
      })
    : "20/10";
  const timeFormatted = validDate
    ? createdDate.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: GHANA_TZ,
      })
    : "19:05";

  // Clean Ticket ID display
  const ticketId = ticket.code.replace(/^BTX-/, "").replace(/^WIN-/, "") || ticket.code;

  // Calculate total odds
  const totalOdds = (ticket.selections || []).reduce((acc, s) => acc * s.multiplier, 1);
  const totalOddsFormatted = totalOdds.toFixed(2);

  // Bonus calculation (approx 5-10% multibet accumulator bonus)
  const calculatedBonus = Math.max(0, ticket.payout - ticket.stake * totalOdds);
  const bonusFormatted =
    calculatedBonus > 0
      ? calculatedBonus.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : (ticket.payout * 0.05).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

  const handleDelete = () => {
    if (window.confirm(`Delete won ticket ${ticket.code} from history?`)) {
      if (onDeleteTicket) {
        onDeleteTicket(ticket.code);
      }
      onClose();
      toast.success(`Ticket ${ticket.code} deleted.`);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ticket Details"
      className="fixed inset-0 z-50 flex flex-col bg-[#101319] text-white overflow-y-auto animate-in slide-in-from-bottom duration-200 select-none pb-12"
    >
      {/* ── 1. RED HEADER BAR (Exact Match to User Screenshot) ── */}
      <header className="sticky top-0 z-40 w-full bg-[#E41B23] shadow-md border-b border-red-700">
        <div className="mx-auto w-full max-w-xl flex h-13 items-center justify-between px-3 sm:px-4">
          {/* Left: Back button */}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 text-white hover:text-white/80 active:scale-95 transition-all text-sm font-bold cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5 stroke-[2.5]" />
            <span>Back</span>
          </button>

          {/* Center: Ticket Details title */}
          <h1 className="text-base sm:text-lg font-black text-white tracking-wide">
            Ticket Details
          </h1>

          {/* Right: Support headset & Home icons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                toast.info("BETRIX Customer Support 24/7", {
                  description: `Support assistance for ticket ${ticket.code}. WhatsApp & Live Chat available.`,
                })
              }
              className="text-white hover:text-white/80 active:scale-95 transition-transform cursor-pointer"
              title="Customer Support"
            >
              <Headphones className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate({ to: "/" });
              }}
              className="text-white hover:text-white/80 active:scale-95 transition-transform cursor-pointer"
              title="Home"
            >
              <Home className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── 2. MAIN CONTENT CONTAINER ── */}
      <main className="mx-auto w-full max-w-xl px-3 sm:px-4 pt-3 sm:pt-4 space-y-4">
        {/* Top Summary Card (Dark Sports-Tech UI) */}
        <div className="rounded-xl border border-[#222938] bg-[#151924] p-4 sm:p-5 shadow-lg space-y-3">
          {/* Row 1: Ticket ID & Date */}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Ticket ID: <strong className="font-mono text-gray-300 font-bold">{ticketId}</strong></span>
            <span className="font-mono text-gray-400 font-medium">{dateFormatted}, {timeFormatted}</span>
          </div>

          {/* Row 2: Multiple / Single & Won badge */}
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
              {ticket.selections.length > 1 ? "Multiple" : "Single"}
            </h2>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-[#00E676] bg-[#00E676]/10 px-2 py-0.5 rounded-md border border-[#00E676]/20">
              <Trophy className="h-3.5 w-3.5 text-[#00E676]" />
              <span>Won</span>
            </div>
          </div>

          {/* Row 3: Total Return (Huge vibrant green numbers) */}
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-xs font-semibold text-gray-300">Total BETRIX Return</span>
            <span className="font-mono font-black text-2xl sm:text-3xl text-[#00E676] tabular-nums tracking-tight drop-shadow-[0_0_12px_rgba(0,230,118,0.3)]">
              {ticket.payout.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>

          {/* Row 4-6: Stake, Odds, Bonus Breakdown */}
          <div className="space-y-1.5 pt-2 border-t border-[#222a3d] text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Total Stake</span>
              <span className="font-mono font-bold text-white">{ticket.stake.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Total Odds</span>
              <span className="font-mono font-bold text-white">{totalOddsFormatted}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Total Bonus</span>
              <span className="font-mono font-bold text-white">{bonusFormatted}</span>
            </div>
          </div>

          {/* Row 7: Action Buttons (Show Off in Gold & Remix Bet in Vibrant Green) */}
          <div className="grid grid-cols-2 gap-3 pt-3">
            {/* Show Off Button */}
            <button
              type="button"
              onClick={() => onShowOff(ticket)}
              className="w-full bg-[#F5C400] hover:bg-[#e0b300] active:scale-95 text-black font-black text-xs sm:text-sm py-2.5 sm:py-3 rounded-lg flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
              title="Celebrate with Golden Winning Cup"
            >
              <Share2 className="h-4 w-4 stroke-[2.5]" />
              <span>Show Off</span>
            </button>

            {/* Remix Bet Button */}
            <button
              type="button"
              onClick={() => onRemixBet(ticket)}
              className="w-full bg-[#00a859] hover:bg-[#00914c] active:scale-95 text-white font-black text-xs sm:text-sm py-2.5 sm:py-3 rounded-lg flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
              title="Load selections into betslip to remix and stake again"
            >
              <Sparkles className="h-4 w-4" />
              <span>Remix Bet</span>
            </button>
          </div>
        </div>

        {/* ── 3. GAMES / MATCHES WON SECTION (Exact Layout to User Screenshot) ── */}
        <div className="rounded-xl border border-[#222938] bg-[#141822] overflow-hidden shadow-md divide-y divide-[#1f2637]">
          {ticket.selections.map((s, idx) => {
            // Generate clean simulated game ID from matchId
            const gameId = Math.abs(
              s.matchId.split("").reduce((acc, char) => acc * 31 + char.charCodeAt(0), 7),
            )
              .toString()
              .slice(0, 5);

            // Extract FT score from leg title if available, or generate a realistic winning score
            const ftMatch = s.matchTitle?.match(/\(FT\s*([0-9]+:[0-9]+)\)/i);
            const scoreDisplay = ftMatch ? ftMatch[1] : idx === 0 ? "2:1" : idx === 1 ? "1:3" : "2:0";

            // Clean title (remove (FT ...) suffix if present)
            const cleanTitle = s.matchTitle?.replace(/\(FT.*?\)/i, "").trim() || "Match";
            const vsTitle = cleanTitle.replace(/\s+vs\.?\s+/i, " v ");

            return (
              <div key={idx} className="p-3.5 sm:p-4 space-y-2.5">
                {/* Header with Green Checkmark */}
                <div className="flex items-start gap-2.5">
                  <div className="h-5 w-5 rounded-full bg-[#00a859] flex items-center justify-center text-white shrink-0 mt-0.5 shadow-xs">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    {/* Game ID & Kickoff */}
                    <div className="text-[11px] font-mono text-gray-400">
                      Game ID: {gameId} | {s.kickoffTime || dateFormatted}
                    </div>

                    {/* Match Title: Team Home v Team Away */}
                    <h3 className="font-bold text-sm sm:text-base text-white truncate">
                      {vsTitle}
                    </h3>

                    {/* Match Tracker link & FT Score */}
                    <div className="flex items-center gap-3 text-xs">
                      <Link
                        to="/matches"
                        className="flex items-center gap-1 font-bold text-[#00E676] hover:underline"
                      >
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span>Match Tracker</span>
                      </Link>
                      <span className="text-gray-400 font-semibold font-mono text-[11px]">
                        FT Score: {scoreDisplay}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Highlighted Mint Green Outcome Card with Watermark Trophy (Exact Screenshot Match) */}
                <div className="ml-7 rounded-lg bg-[#0e271a] border border-[#1b4b2e] p-3 relative overflow-hidden flex items-center justify-between shadow-xs">
                  {/* Left Outcome text */}
                  <div className="space-y-0.5 text-xs text-emerald-200 z-10">
                    <div className="flex items-center gap-1 text-white font-bold text-xs sm:text-sm">
                      <span className="text-gray-400 font-normal">Pick</span>
                      <span className="font-extrabold text-white">
                        {s.optionLabel}@{s.multiplier.toFixed(2)}
                      </span>
                      <Check className="h-3.5 w-3.5 text-[#00E676] stroke-[3]" />
                    </div>
                    <div className="text-gray-300">
                      <span className="text-gray-400">Market</span> {s.marketName}
                    </div>
                    <div className="text-gray-300">
                      <span className="text-gray-400">Outcome</span> {s.optionLabel}
                    </div>
                  </div>

                  {/* Right: Trophy Silhouette Watermark (Matches Screenshot) */}
                  <Trophy className="h-16 w-16 text-emerald-400/20 absolute -right-1 -bottom-2 pointer-events-none stroke-[1.25]" />
                </div>
              </div>
            );
          })}
        </div>

        {/* ── 4. BOTTOM DETAIL ROWS (Exact Screenshot Match) ── */}
        <div className="rounded-xl border border-[#222938] bg-[#141822] divide-y divide-[#1f2637] text-xs">
          {/* Number of Bets */}
          <div className="p-3.5 flex items-center justify-between">
            <span className="text-gray-300 font-semibold">Number of Bets: 1</span>
            <button
              type="button"
              onClick={() =>
                toast.info(`Slip Details: ${ticket.code}`, {
                  description: `${ticket.selections.length} legs • Total Stake: GHS ${ticket.stake.toFixed(2)} • Return: GHS ${ticket.payout.toFixed(2)}`,
                })
              }
              className="text-[#00E676] font-extrabold flex items-center gap-0.5 hover:underline cursor-pointer"
            >
              <span>Bet Details</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Check Transaction History */}
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate({ to: "/profile" });
            }}
            className="w-full p-3.5 flex items-center justify-between text-gray-300 hover:text-white hover:bg-[#1a2130] transition-colors cursor-pointer text-left font-semibold"
          >
            <span>Check Transaction History</span>
            <ChevronRight className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* ── 5. DELETE TICKET ACTION (Exact Screenshot Match) ── */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={handleDelete}
            className="text-red-500 hover:text-red-400 active:scale-95 font-bold text-xs py-2 px-4 transition-colors cursor-pointer"
          >
            Delete Ticket
          </button>
        </div>
      </main>
    </div>
  );
}
