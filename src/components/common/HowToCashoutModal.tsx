import React from "react";
import {
  HelpCircle,
  Zap,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Receipt,
  X,
  Sparkles,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface HowToCashoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HowToCashoutModal({ open, onOpenChange }: HowToCashoutModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white text-gray-900 border-gray-200 max-w-md rounded-2xl p-0 overflow-hidden shadow-2xl">
        {/* Header Bar */}
        <div className="bg-[#1e232d] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-[#00a859]/20 flex items-center justify-center text-[#00a859] border border-[#00a859]/30">
              <HelpCircle className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-extrabold text-white">How Cash Out Works</DialogTitle>
              <p className="text-[11px] text-gray-400">Lock in your winnings or cut losses early</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Step 1 */}
          <div className="flex gap-3 bg-gray-50 border border-gray-100 rounded-xl p-3">
            <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs shrink-0">
              1
            </div>
            <div className="space-y-1">
              <p className="font-extrabold text-gray-900">Check Your Open Bets</p>
              <p className="text-gray-600 leading-relaxed">
                Head to the <span className="font-bold text-gray-800">Open Bets</span> tab in My Bets. Active slips eligible for cashout will display a bright green/yellow <span className="font-bold">Cash Out</span> button.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-3 bg-gray-50 border border-gray-100 rounded-xl p-3">
            <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs shrink-0">
              2
            </div>
            <div className="space-y-1">
              <p className="font-extrabold text-gray-900">Live Dynamic Valuation</p>
              <p className="text-gray-600 leading-relaxed">
                The cash out offer updates in real time based on current match scores, minute elapsed, possession, and changing probabilities.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-3 bg-gray-50 border border-gray-100 rounded-xl p-3">
            <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs shrink-0">
              3
            </div>
            <div className="space-y-1">
              <p className="font-extrabold text-gray-900">Instant Account Settlement</p>
              <p className="text-gray-600 leading-relaxed">
                Once confirmed, the agreed cashout funds are instantly credited to your deposited balance. You do not need to wait for the final whistle!
              </p>
            </div>
          </div>

          {/* Special Feature: 1UP & 2UP Early Payout */}
          <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-emerald-800 font-extrabold text-xs">
              <ShieldCheck className="h-4 w-4 text-[#00a859]" />
              <span>1UP & 2UP Early Payout Guarantee</span>
            </div>
            <p className="text-emerald-700 text-[11px] leading-relaxed">
              If the team you backed in the 1X2 market goes <span className="font-bold text-emerald-950">2 goals ahead</span> at any point in regular time, your selection is paid out as a <span className="font-bold text-emerald-950">WIN</span> immediately — even if the opponent comes back to draw or win!
            </p>
          </div>

          {/* Example preview card */}
          <div className="border border-gray-200 rounded-xl p-3 bg-white space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 pb-1.5 border-b border-gray-100">
              <span>Example Ticket #80435T</span>
              <span className="text-emerald-600 font-mono font-black">Live 78'</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <div>
                <span className="text-gray-500">Initial Stake:</span> <span className="font-bold">GHS 50.00</span>
              </div>
              <div className="text-right">
                <span className="text-gray-500">Cash Out Offer:</span>{" "}
                <span className="font-bold text-emerald-600 font-mono text-sm">GHS 124.50</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-3 bg-gray-50 border-t border-gray-100 flex justify-end">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full bg-[#00a859] hover:bg-[#008f4c] text-white font-extrabold text-xs rounded-xl py-2.5"
          >
            Got It
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
