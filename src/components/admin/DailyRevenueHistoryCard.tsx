import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  RotateCcw,
  Receipt,
  CheckCircle2,
} from "lucide-react";
import { useBetrix, type DailyRevenueEntry } from "@/store/betrix";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { GHANA_TZ } from "@/lib/ghana-time";

export const formatGHC = (n: number) => {
  if (n === 0) return "GH₵0";
  return n % 1 === 0
    ? `GH₵${n.toLocaleString()}`
    : `GH₵${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

interface DayItem {
  dateStr: string; // "YYYY-MM-DD"
  dayAbbr: string; // "WE", "TH", "FR", "SA", "TODAY"
  dayNum: string; // "14", "15", "16", "17", "18"
  month: string; // "Oct"
  isToday: boolean;
  revenue: number;
}

export function DailyRevenueHistoryCard() {
  const { getRevenueForDate } = useBetrix();

  // Offset in days for pagination (0 = week ending today)
  const [dayOffset, setDayOffset] = useState<number>(0);
  const [inspectedDay, setInspectedDay] = useState<string | null>(null);

  // Generate 5 days window based on dayOffset
  const { days, rangeTitle, todayDateStr } = useMemo(() => {
    const today = new Date();
    const todayISO = today.toISOString().slice(0, 10);
    const dayList: DayItem[] = [];

    // Anchor end date
    const anchor = new Date(today.getTime() - dayOffset * 86400000);

    for (let i = 4; i >= 0; i--) {
      const d = new Date(anchor.getTime() - i * 86400000);
      const iso = d.toISOString().slice(0, 10);
      const isToday = iso === todayISO;
      const dayName = d.toLocaleDateString("en-US", { weekday: "short", timeZone: GHANA_TZ }).toUpperCase().slice(0, 2);
      const dayNum = d.toLocaleDateString("en-US", { day: "numeric", timeZone: GHANA_TZ });
      const month = d.toLocaleDateString("en-US", { month: "short", timeZone: GHANA_TZ });

      const stats = getRevenueForDate(iso);

      dayList.push({
        dateStr: iso,
        dayAbbr: isToday ? "TODAY" : dayName,
        dayNum,
        month,
        isToday,
        revenue: stats.totalRevenue,
      });
    }

    const first = dayList[0];
    const last = dayList[dayList.length - 1];
    const range = `${first.dayNum} ${first.month} – ${last.dayNum} ${last.month}`;

    return { days: dayList, rangeTitle: range, todayDateStr: todayISO };
  }, [dayOffset, getRevenueForDate]);

  const handlePrev = () => {
    setDayOffset((prev) => prev + 5);
  };

  const handleNext = () => {
    setDayOffset((prev) => Math.max(0, prev - 5));
  };

  const activeStats = inspectedDay ? getRevenueForDate(inspectedDay) : null;

  return (
    <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100 space-y-3.5 transition-all">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
            <h3 className="text-sm font-black text-gray-900 tracking-tight">
              Daily Revenue History
            </h3>
          </div>
          <p className="text-xs text-gray-400 font-medium pl-3.5">{rangeTitle}</p>
        </div>

        {/* Navigation Arrows < > */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrev}
            title="Previous dates"
            className="h-8 w-8 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={dayOffset === 0}
            title="Next dates"
            className={cn(
              "h-8 w-8 rounded-xl border border-gray-200 flex items-center justify-center transition-colors",
              dayOffset === 0
                ? "text-gray-300 border-gray-100 cursor-not-allowed"
                : "text-gray-500 hover:text-gray-900 hover:border-gray-300"
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Days Cards Row (5 columns matching screenshot) */}
      <div className="grid grid-cols-5 gap-2">
        {days.map((item) => {
          const isSelected = inspectedDay === item.dateStr;

          return (
            <button
              key={item.dateStr}
              type="button"
              onClick={() => setInspectedDay(isSelected ? null : item.dateStr)}
              className={cn(
                "rounded-2xl p-2.5 flex flex-col items-center justify-between transition-all select-none text-center relative",
                item.isToday
                  ? "border-2 border-red-500 bg-white shadow-xs"
                  : isSelected
                  ? "border-2 border-gray-800 bg-gray-50"
                  : "border border-gray-200/90 bg-white hover:border-gray-300 hover:bg-gray-50/50"
              )}
            >
              {/* Day abbreviation */}
              <span
                className={cn(
                  "text-[10px] font-extrabold uppercase tracking-wider block",
                  item.isToday ? "text-red-500 font-black" : "text-gray-400"
                )}
              >
                {item.dayAbbr}
              </span>

              {/* Day number */}
              <span
                className={cn(
                  "text-base md:text-lg font-black my-1 leading-none tracking-tight block",
                  item.isToday ? "text-red-500" : "text-gray-800"
                )}
              >
                {item.dayNum}
              </span>

              {/* Month */}
              <span
                className={cn(
                  "text-[10px] font-medium mb-2 block",
                  item.isToday ? "text-red-400" : "text-gray-400"
                )}
              >
                {item.month}
              </span>

              {/* Revenue Badge (Mint green for revenue > 0, gray pill for 0) */}
              <span
                className={cn(
                  "text-[9px] font-black px-1.5 py-0.5 rounded-full inline-block truncate max-w-full font-mono",
                  item.revenue > 0
                    ? "bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0]"
                    : "bg-gray-100 text-gray-500"
                )}
              >
                {formatGHC(item.revenue)}
              </span>

              {/* Red Bottom Dash on TODAY */}
              {item.isToday && (
                <div className="h-0.5 w-5 bg-red-500 rounded-full mt-1.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Date Detail Drawer when a day is selected */}
      {inspectedDay && activeStats && (
        <div className="mt-3 p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1.5 animate-in fade-in-50">
          <div className="flex items-center justify-between">
            <span className="font-bold text-gray-700">
              Transactions on {inspectedDay}:
            </span>
            <span className="font-black text-gray-900 font-mono">
              {formatGHC(activeStats.totalRevenue)} ({activeStats.transactionsCount} deposits)
            </span>
          </div>
          <p className="text-[11px] text-gray-500">
            Real platform settlements and verified player deposits for this date.
          </p>
        </div>
      )}
    </div>
  );
}
