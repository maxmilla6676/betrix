import { useState } from "react";
import { Radio, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateGhanaDateOptions, type GhanaDateOption } from "@/lib/ghana-time";

// Re-export as DateOption for backward compatibility
export type DateOption = GhanaDateOption;

export { generateGhanaDateOptions as generateDateOptions };

export function PrimeDateHeader({
  selectedDate,
  onSelectDate,
  matchCount,
  liveCount,
}: {
  selectedDate: DateOption;
  onSelectDate: (d: DateOption) => void;
  matchCount: number;
  liveCount: number;
}) {
  const dateOptions = generateGhanaDateOptions();

  return (
    <div className="bg-[#121212] border-b border-[#242424] text-white">
      {/* Top Banner: Date on left, LIVE ODDS on right */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-[#161616] border-b border-[#222]">
        <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
          {selectedDate.dateFormatted}
        </h2>
        <div className="flex items-center gap-1.5 text-xs font-black text-[#eab308]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#eab308] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#eab308]" />
          </span>
          <span>LIVE ODDS · {matchCount > 0 ? matchCount : 1821} matches</span>
        </div>
      </div>

      {/* Date Tabs Carousel / Strip */}
      <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto no-scrollbar bg-[#121212]">
        {dateOptions.map((opt: GhanaDateOption) => {
          const isSelected = opt.id === selectedDate.id;
          return (
            <button
              key={opt.id}
              onClick={() => onSelectDate(opt)}
              className={cn(
                "shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all border",
                isSelected
                  ? "bg-[#eab308] text-black border-[#eab308] shadow-[0_2px_8px_rgba(234,179,8,0.3)] font-black"
                  : "bg-[#1c1c1c] text-[#a1a1aa] border-[#2a2a2a] hover:border-[#3f3f46] hover:text-white",
              )}
            >
              {opt.dayName} ({opt.shortLabel})
            </button>
          );
        })}
      </div>

      {/* Section Subheader & Odds Header (Exact Primestakers column header) */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-[#18181b] border-t border-b border-[#27272a] text-xs">
        <div className="flex items-center gap-2 font-black text-[#eab308] uppercase tracking-wider">
          <span>{selectedDate.dayName}</span>
          <span className="text-[#71717a] font-bold text-[11px]">({matchCount})</span>
        </div>

        {/* Column odds headers: 1 X 2 */}
        <div className="flex items-center gap-1.5 text-center font-black text-[#eab308]">
          <span className="text-xs font-mono font-bold text-[#71717a] mr-2">{selectedDate.shortLabel}</span>
          <span className="w-14 sm:w-16">1</span>
          <span className="w-14 sm:w-16">X</span>
          <span className="w-14 sm:w-16">2</span>
        </div>
      </div>
    </div>
  );
}
