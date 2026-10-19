import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  X,
  Check,
  Copy,
  Trash2,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Share2,
  Download,
  Link2,
  MessageSquare,
  Send,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatGHS, useBetrix, type HistoryEntry, type Selection } from "@/store/betrix";
import { matchById, teamById, matches as seedMatches } from "@/data/football";
import { cn } from "@/lib/utils";

function generateBookingCode(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let res = "";
  for (let i = 0; i < length; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

function nowStr() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

interface BookData {
  code: string;
  stake: number;
  totalOdds: number;
  payout: number;
  selections: Selection[];
  createdAt: string;
  ref: string;
}

export function BookBetModal({
  data,
  onClose,
}: {
  data: BookData;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showName, setShowName] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(data.code);
    setCopied(true);
    toast.success("Booking Code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareText = `Check out my bet slip on BETRIX! Booking Code: ${data.code} | Total Odds: ${data.totalOdds.toFixed(2)} | Potential Win: GHS ${data.payout.toLocaleString()}`;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#111111] text-white overflow-y-auto animate-in fade-in duration-200">
      {/* Header bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-4 bg-[#111111]">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-full bg-[#10b981] text-black grid place-items-center">
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
          <span className="font-black text-lg tracking-tight text-white">
            Bet Booked
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Content Container */}
      <div className="flex-1 max-w-sm w-full mx-auto px-4 pb-8 space-y-6">
        {/* Ticket Card Image replica */}
        <div className="bg-[#1a1a1a] rounded-xl overflow-hidden shadow-2xl border border-white/5 text-white">
          {/* Top Yellow Brand Header */}
          <div className="bg-[#F5C400] text-black px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <span className="font-black text-xl tracking-tight uppercase font-sans">
                BETRIX<span className="text-[9px] align-super font-bold">.com</span>
              </span>
            </div>
            <div className="text-right text-[10px] font-bold leading-tight text-black/80">
              <div>Betslip</div>
              <div>{data.createdAt}</div>
            </div>
          </div>

          {/* Ticket Content */}
          <div className="p-4 space-y-3">
            {/* Booking Code Label & Code */}
            <div className="text-center space-y-0.5 pt-1">
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                BOOKING CODE
              </p>
              <p className="text-3xl font-black tracking-[0.25em] text-[#F5C400] font-mono">
                {data.code}
              </p>
            </div>

            {/* Total Odds Bar */}
            <div className="bg-[#F5C400] text-black px-3 py-2 flex items-center justify-between rounded-sm">
              <span className="font-bold text-xs">Total Odds</span>
              <span className="font-black text-sm">{data.totalOdds.toFixed(2)}</span>
            </div>

            {/* Example Bet Box */}
            <div className="space-y-1 text-xs px-1 pt-1">
              <p className="text-[11px] font-bold text-[#F5C400]">Example Bet</p>
              <div className="flex justify-between text-gray-400 text-[11px]">
                <span>Stake</span>
                <span className="font-bold text-gray-200">GHS {data.stake.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400 text-[11px]">
                <span>Payout</span>
                <span className="font-black text-[#F5C400]">
                  GHS {data.payout.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Selections Section */}
            <div className="space-y-2 pt-1 border-t border-white/5">
              <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider px-1">
                SELECTIONS
              </p>
              <div className="space-y-3 max-h-56 overflow-y-auto px-1">
                {data.selections.map((s, idx) => {
                  const match = matchById(s.matchId);
                  const home = match ? teamById(match.homeId)?.name : "Home";
                  const away = match ? teamById(match.awayId)?.name : "Away";
                  return (
                    <div key={idx} className="space-y-0.5">
                      <p className="text-[10px] text-gray-400 font-medium">
                        {home} vs {away}
                      </p>
                      <div className="flex items-center justify-between text-xs font-bold text-white">
                        <span>
                          {s.optionLabel} <span className="font-normal text-gray-400">· {s.marketName}</span>
                        </span>
                        <span className="font-black text-white">{s.multiplier.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ticket Footer Stamp */}
            <div className="pt-3 text-center border-t border-white/5 text-[10px] text-gray-500 font-medium">
              betrix.com · code {data.code}
              {showName && <span className="block text-[#F5C400] font-bold mt-0.5">Booked by BETRIX User</span>}
            </div>
          </div>
        </div>

        {/* BOOKING CODE text & large code with copy button */}
        <div className="text-center space-y-2 pt-2">
          <p className="text-[11px] font-bold uppercase text-gray-400 tracking-widest">
            BOOKING CODE
          </p>

          <div className="flex items-center justify-center space-x-3">
            <span className="text-3xl font-black tracking-[0.2em] text-[#F5C400] font-mono">
              {data.code}
            </span>
            <button
              onClick={handleCopyCode}
              className="p-2.5 rounded-xl bg-[#222222] hover:bg-[#2e2e2e] text-gray-200 transition-colors"
              title="Copy Code"
            >
              {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>

          <p className="text-xs text-gray-400 font-medium max-w-xs mx-auto">
            Share this code so friends can load your exact selections.
          </p>
        </div>

        <hr className="border-white/10 my-4" />

        {/* Toggle option */}
        <div className="flex items-center justify-between px-1">
          <span className="text-sm font-bold text-white">
            Show my name on the image
          </span>
          <button
            type="button"
            onClick={() => setShowName(!showName)}
            className={cn(
              "w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out",
              showName ? "bg-[#10b981]" : "bg-[#333333]"
            )}
          >
            <div
              className={cn(
                "bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out",
                showName ? "translate-x-6" : "translate-x-0"
              )}
            />
          </button>
        </div>

        {/* 6 Circular Share Buttons */}
        <div className="grid grid-cols-6 gap-2 pt-3">
          {/* 1. Save */}
          <button
            onClick={() => {
              toast.info("Image save preview generated");
            }}
            className="flex flex-col items-center justify-center space-y-1.5"
          >
            <div className="w-12 h-12 rounded-full bg-[#222222] hover:bg-[#333333] grid place-items-center text-gray-200 transition-colors">
              <Download className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold text-gray-300">Save</span>
          </button>

          {/* 2. Link */}
          <button
            onClick={handleCopyCode}
            className="flex flex-col items-center justify-center space-y-1.5"
          >
            <div className="w-12 h-12 rounded-full bg-[#222222] hover:bg-[#333333] grid place-items-center text-gray-200 transition-colors">
              <Link2 className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold text-gray-300">Link</span>
          </button>

          {/* 3. WhatsApp */}
          <button
            onClick={() => {
              window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
            }}
            className="flex flex-col items-center justify-center space-y-1.5"
          >
            <div className="w-12 h-12 rounded-full bg-[#25D366] text-white grid place-items-center hover:opacity-90 transition-opacity">
              <MessageSquare className="w-5 h-5 fill-white" />
            </div>
            <span className="text-[11px] font-semibold text-gray-300">WhatsApp</span>
          </button>

          {/* 4. Telegram */}
          <button
            onClick={() => {
              window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(shareText)}`, "_blank");
            }}
            className="flex flex-col items-center justify-center space-y-1.5"
          >
            <div className="w-12 h-12 rounded-full bg-[#2AABEE] text-white grid place-items-center hover:opacity-90 transition-opacity">
              <Send className="w-5 h-5 fill-white" />
            </div>
            <span className="text-[11px] font-semibold text-gray-300">Telegram</span>
          </button>

          {/* 5. X */}
          <button
            onClick={() => {
              window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, "_blank");
            }}
            className="flex flex-col items-center justify-center space-y-1.5"
          >
            <div className="w-12 h-12 rounded-full bg-[#1e1e1e] text-white border border-white/10 grid place-items-center hover:bg-[#2b2b2b] transition-colors">
              <span className="font-black text-base">X</span>
            </div>
            <span className="text-[11px] font-semibold text-gray-300">X</span>
          </button>

          {/* 6. Facebook */}
          <button
            onClick={() => {
              window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}`, "_blank");
            }}
            className="flex flex-col items-center justify-center space-y-1.5"
          >
            <div className="w-12 h-12 rounded-full bg-[#1877F2] text-white grid place-items-center hover:opacity-90 transition-opacity">
              <Share2 className="w-5 h-5 fill-white" />
            </div>
            <span className="text-[11px] font-semibold text-gray-300">Facebook</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function SlipContent({ onDone }: { onDone?: () => void }) {
  const {
    slip,
    removeSelection,
    clearSlip,
    totalMultiplier,
    confirmSlip,
    balance,
    toggleSelection,
  } = useBetrix();

  const [betType, setBetType] = useState<"Single" | "Multiple" | "System">("Single");
  const [itemStakes, setItemStakes] = useState<Record<string, number>>({});
  const [globalStake, setGlobalStake] = useState<number>(30);

  const [confirmed, setConfirmed] = useState<HistoryEntry | null>(null);
  const [bookData, setBookData] = useState<BookData | null>(null);
  const [copied, setCopied] = useState(false);

  const [bookingCode, setBookingCode] = useState("");
  const [loadingCode, setLoadingCode] = useState(false);

  const { totalStake, totalPotential } = useMemo(() => {
    if (betType === "Single") {
      let stakeSum = 0;
      let winSum = 0;
      for (const s of slip) {
        const key = `${s.matchId}-${s.marketId}`;
        const st = itemStakes[key] ?? 10;
        stakeSum += st;
        winSum += Math.round(st * s.multiplier);
      }
      return { totalStake: stakeSum || 10 * slip.length, totalPotential: winSum };
    } else {
      const st = globalStake || 30;
      return { totalStake: st, totalPotential: Math.round(st * totalMultiplier) };
    }
  }, [slip, betType, itemStakes, globalStake, totalMultiplier]);

  const isInsufficient = totalStake > balance;

  const handleItemStakeChange = (key: string, val: number) => {
    setItemStakes((prev) => ({ ...prev, [key]: Math.max(0, val) }));
  };

  const handleLoadBookingCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingCode.trim()) {
      toast.error("Please enter a valid booking code");
      return;
    }
    setLoadingCode(true);
    setTimeout(() => {
      const sample1 = seedMatches[0];
      const sample2 = seedMatches[1];
      const m1 = sample1?.markets[0];
      const o1 = m1?.options[0];
      if (sample1 && m1 && o1) {
        toggleSelection({
          matchId: sample1.id,
          marketId: m1.id,
          marketName: m1.name,
          optionId: o1.id,
          optionLabel: o1.label,
          multiplier: o1.multiplier,
        });
      }
      const m2 = sample2?.markets[0];
      const o2 = m2?.options[0];
      if (sample2 && m2 && o2) {
        toggleSelection({
          matchId: sample2.id,
          marketId: m2.id,
          marketName: m2.name,
          optionId: o2.id,
          optionLabel: o2.label,
          multiplier: o2.multiplier,
        });
      }
      setLoadingCode(false);
      setBookingCode("");
      toast.success(`Booking code ${bookingCode.toUpperCase()} loaded successfully!`);
    }, 600);
  };

  const handleBookBet = () => {
    if (slip.length === 0) {
      toast.error("Add selections to book a bet");
      return;
    }
    const code = generateBookingCode(6);
    const ref = `PS-${Math.floor(100000 + Math.random() * 899999)}`;
    const data: BookData = {
      code,
      stake: totalStake,
      totalOdds: totalMultiplier,
      payout: totalPotential,
      selections: [...slip],
      createdAt: nowStr(),
      ref,
    };
    setBookData(data);
  };

  if (confirmed) {
    return (
      <div className="space-y-4 p-5 bg-[#121216] text-white h-full flex flex-col justify-center">
        <div className="bg-[#1a1a22] border border-[#2a2a35] rounded-2xl p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#F5C400]/20 text-[#F5C400] grid place-items-center mx-auto">
            <Check className="h-6 w-6" />
          </div>
          <p className="text-xs uppercase font-extrabold tracking-widest text-gray-400">
            Bet Placed Successfully
          </p>
          <p className="font-mono text-3xl font-black text-[#F5C400]">
            {confirmed.code}
          </p>
          <p className="text-xs text-gray-400 font-semibold">
            {confirmed.selections.length} selections · {formatGHS(confirmed.stake)} staked
          </p>
          <div className="pt-4 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard?.writeText(confirmed.code);
                setCopied(true);
                toast.success("Booking Code copied!");
                setTimeout(() => setCopied(false), 2000);
              }}
              className="border-[#2a2a35] text-gray-300 hover:text-white"
            >
              <Copy className="h-4 w-4 mr-2" />
              {copied ? "Copied" : "Copy Code"}
            </Button>
            <Button
              onClick={() => {
                setConfirmed(null);
                onDone?.();
              }}
              className="bg-[#F5C400] hover:bg-[#e0b300] text-black font-bold"
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {bookData && (
        <BookBetModal data={bookData} onClose={() => setBookData(null)} />
      )}

      <div className="flex flex-col h-full bg-[#0e0e11] text-white">
        {/* Yellow Top Bar Header */}
        <div className="px-3 pt-2 pb-2 bg-[#0e0e11]">
          <div className="w-10 h-1 bg-[#2a2a35] rounded-full mx-auto mb-2" />
          <div className="bg-[#F5C400] text-black font-extrabold rounded-2xl px-4 py-2.5 flex items-center justify-between shadow-md">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-black">{slip.length}</span>
              <span className="text-base font-black tracking-tight">Bet Slip</span>
            </div>
            <button
              onClick={onDone}
              type="button"
              className="w-7 h-7 rounded-xl bg-black/10 hover:bg-black/20 flex items-center justify-center text-black transition-colors"
              aria-label="Close bet slip"
            >
              <X className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* Load Booking Code Bar */}
        <form
          onSubmit={handleLoadBookingCode}
          className="p-3 bg-[#16161c] border-b border-[#22222c] flex items-center space-x-2"
        >
          <input
            type="text"
            placeholder="Load Booking Code..."
            value={bookingCode}
            onChange={(e) => setBookingCode(e.target.value)}
            className="flex-1 bg-[#0b0e14] border border-[#262936] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#F5C400] font-mono tracking-wider"
          />
          <button
            type="submit"
            disabled={loadingCode}
            className="bg-[#262936] hover:bg-[#323646] text-[#F5C400] font-bold text-xs uppercase px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
          >
            {loadingCode ? "Loading..." : "Load"}
          </button>
        </form>

        {/* Header with Bet Type Tabs — only shown when slip has items */}
        {slip.length > 0 && (
        <div className="p-3 bg-[#121216] border-b border-[#1f1f28]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-sm uppercase tracking-wider text-white">
                Bet Slip
              </span>
              <span className="bg-[#F5C400] text-black text-[10px] font-black px-1.5 py-0.5 rounded-md">
                {slip.length}
              </span>
            </div>
            <button
              onClick={clearSlip}
              className="text-xs text-gray-400 hover:text-red-400 flex items-center space-x-1 font-semibold transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear All</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-[#0b0e14] p-1 rounded-xl border border-[#1f222e]">
            {(["Single", "Multiple", "System"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setBetType(tab)}
                className={cn(
                  "py-1.5 text-xs font-bold rounded-lg transition-all text-center",
                  betType === tab
                    ? "bg-[#F5C400] text-black shadow"
                    : "text-gray-400 hover:text-white"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        )}

        {/* Slip Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {slip.length === 0 ? (
            <div className="text-center py-8 text-gray-500 space-y-3 flex flex-col items-center justify-center">
              <span className="text-5xl">🎯</span>
              <p className="font-bold text-base text-white">Your Bet Slip is Empty</p>
              <p className="text-xs text-gray-400 max-w-[220px] mx-auto">
                Tap any odds to add a selection.
              </p>
            </div>
          ) : (
            slip.map((s) => {
              const match = matchById(s.matchId);
              const isFinished = match?.status === "FINISHED";
              const home = match ? teamById(match.homeId)?.name : "Home";
              const away = match ? teamById(match.awayId)?.name : "Away";
              const key = `${s.matchId}-${s.marketId}`;
              const itemStake = itemStakes[key] ?? 10;

              return (
                <div
                  key={key}
                  className={cn(
                    "border rounded-xl p-3 space-y-2 relative group transition-colors",
                    isFinished
                      ? "bg-[#141214] border-red-900/40"
                      : "bg-[#12141c] border-[#1e2230] hover:border-[#F5C400]/40"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold text-white leading-snug">
                        {home} vs {away}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {s.marketName}:{" "}
                        <span className="font-bold text-[#F5C400]">{s.optionLabel}</span>
                      </p>
                      {isFinished && (
                        <span className="inline-flex items-center gap-1 mt-1 rounded bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400 border border-red-500/25">
                          <Lock className="h-2.5 w-2.5" /> Match Ended — Odds Locked
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() =>
                        toggleSelection({
                          matchId: s.matchId,
                          marketId: s.marketId,
                          marketName: s.marketName,
                          optionId: s.optionId,
                          optionLabel: s.optionLabel,
                          multiplier: s.multiplier,
                        })
                      }
                      className="text-gray-500 hover:text-red-400 p-1 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#1a1e2b]">
                    <span className="text-[11px] font-extrabold text-gray-400 uppercase">
                      Odds
                    </span>
                    <span className="text-sm font-black text-[#F5C400] bg-[#F5C400]/10 px-2 py-0.5 rounded-md">
                      {s.multiplier.toFixed(2)}
                    </span>
                  </div>

                  {/* Single Bet individual stake input */}
                  {betType === "Single" && (
                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-gray-400">
                        Stake (GHS)
                      </span>
                      <input
                        type="number"
                        min="1"
                        value={itemStake}
                        onChange={(e) =>
                          handleItemStakeChange(key, parseFloat(e.target.value) || 0)
                        }
                        className="w-24 bg-[#0b0e14] border border-[#262936] rounded-lg px-2.5 py-1 text-right text-xs font-bold text-white focus:outline-none focus:border-[#F5C400]"
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Summary */}
        {slip.length > 0 && (
          <div className="p-4 bg-[#121216] border-t border-[#1f1f28] space-y-3">
            {/* Multiple / System Global Stake Input */}
            {betType !== "Single" && (
              <div className="flex items-center justify-between bg-[#0b0e14] p-2.5 rounded-xl border border-[#1e2230]">
                <span className="text-xs font-extrabold uppercase text-gray-300">
                  Total Stake (GHS)
                </span>
                <input
                  type="number"
                  min="1"
                  value={globalStake}
                  onChange={(e) => setGlobalStake(parseFloat(e.target.value) || 0)}
                  className="w-28 bg-[#16161c] border border-[#2b2e3e] rounded-lg px-3 py-1.5 text-right text-sm font-black text-white focus:outline-none focus:border-[#F5C400]"
                />
              </div>
            )}

            {/* Calculations Row */}
            <div className="space-y-1.5 text-xs font-semibold">
              <div className="flex items-center justify-between text-gray-400">
                <span>Overall Multiplier</span>
                <span className="font-bold text-white">{totalMultiplier.toFixed(2)}x</span>
              </div>
              <div className="flex items-center justify-between text-gray-400">
                <span>Total Stake</span>
                <span className="font-bold text-white">
                  GHS {totalStake.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm pt-1 border-t border-[#1f1f28]">
                <span className="font-bold text-gray-200 uppercase tracking-wide">
                  Potential Payout
                </span>
                <span className="font-black text-emerald-400 text-base">
                  GHS {totalPotential.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Locked matches warning */}
            {slip.some((s) => matchById(s.matchId)?.status === "FINISHED") && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-2.5 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                <Lock className="h-3.5 w-3.5 shrink-0 text-red-400" />
                <span>One or more matches have ended. Odds are locked — please remove them to place bet.</span>
              </div>
            )}

            {/* Low balance warning */}
            {isInsufficient && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-2.5 text-xs font-semibold text-center">
                Insufficient balance. You need GHS{" "}
                {(totalStake - balance).toLocaleString()} more.
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {/* Book Bet Button */}
              <button
                type="button"
                onClick={handleBookBet}
                className="flex items-center justify-center space-x-2 h-12 rounded-xl bg-[#1d222e] hover:bg-[#272d3d] border border-[#2e364a] text-white font-bold text-xs uppercase tracking-wider transition-colors active:scale-95"
              >
                <Bookmark className="h-4 w-4 fill-white" />
                <span>Book Bet</span>
              </button>

              {/* Place Bet Button */}
              <button
                type="button"
                disabled={
                  totalStake <= 0 ||
                  isInsufficient ||
                  slip.some((s) => matchById(s.matchId)?.status === "FINISHED")
                }
                onClick={() => setConfirmed(confirmSlip(totalStake))}
                className="flex items-center justify-center h-12 rounded-xl bg-[#F5C400] hover:bg-[#e0b300] text-black font-black text-xs uppercase tracking-wider shadow-md transition-all disabled:opacity-50 active:scale-95"
              >
                Place Bet
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
