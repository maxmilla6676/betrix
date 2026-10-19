import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { LeagueBadge, TeamCrest } from "@/components/common/TeamCrest";
import { useBetrix } from "@/store/betrix";
import { cn } from "@/lib/utils";
import { formatKickoff, leagueById, teamById, isMatchLocked, type Match } from "@/data/football";

export function MatchCard({ match, compact = false }: { match: Match; compact?: boolean }) {
  const { toggleSelection, isSelected } = useBetrix();
  const home = teamById(match.homeId);
  const away = teamById(match.awayId);
  const league = leagueById(match.leagueId);
  const market = match.markets.find((m) => m.id === "1x2")!;
  const disabled = market.status !== "ACTIVE" || isMatchLocked(match);

  return (
    <article className="bg-white border border-gray-200 rounded-2xl p-3.5 transition-all hover:border-red-200 hover:shadow-md sm:p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <LeagueBadge name={league.name} color={league.color} />
        <span className="font-mono text-xs font-bold text-gray-400">{formatKickoff(match.kickoff)}</span>
      </div>

      <Link
        to="/match/$matchId"
        params={{ matchId: match.id }}
        className="mt-3 block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#E41B23]"
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <TeamCrest team={home} size={compact ? "sm" : "md"} />
            <span className="truncate text-sm font-extrabold text-gray-900">{compact ? home.short : home.name}</span>
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest text-gray-300">VS</span>
          <div className="flex min-w-0 items-center justify-end gap-2">
            <span className="truncate text-right text-sm font-extrabold text-gray-900">{compact ? away.short : away.name}</span>
            <TeamCrest team={away} size={compact ? "sm" : "md"} />
          </div>
        </div>
      </Link>

      <div className="mt-3.5 grid grid-cols-3 gap-2">
        {market.options.map((opt) => {
          const active = isSelected(match.id, market.id, opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() =>
                toggleSelection({
                  matchId: match.id,
                  marketId: market.id,
                  marketName: market.name,
                  optionId: opt.id,
                  optionLabel: opt.label,
                  multiplier: opt.multiplier,
                })
              }
              className={cn(
                "group flex flex-col items-center rounded-xl border px-2 py-2 transition-all duration-150 active:scale-[0.97]",
                "disabled:cursor-not-allowed disabled:opacity-40",
                active
                  ? "border-[#E41B23] bg-[#E41B23] text-white shadow-md"
                  : "border-gray-200 bg-gray-50 text-gray-700 hover:border-red-200 hover:bg-red-50",
              )}
            >
              <span className={cn("text-[10px] font-extrabold uppercase tracking-wider", active ? "text-white" : "text-gray-500")}>
                {opt.label}
              </span>
              <span className="font-mono text-sm font-black">
                {disabled ? <Lock className="h-3.5 w-3.5" /> : opt.multiplier.toFixed(2)}
              </span>
            </button>
          );
        })}
      </div>
    </article>
  );
}
