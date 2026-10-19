import { Link } from "@tanstack/react-router";
import { Lock, TrendingUp } from "lucide-react";
import { useBetrix } from "@/store/betrix";
import { cn } from "@/lib/utils";
import { formatKickoff, leagueById, teamById, isMatchLocked, type Match } from "@/data/football";

export function PrimeMatchCard({ match }: { match: Match }) {
  const { toggleSelection, isSelected } = useBetrix();
  const home = teamById(match.homeId);
  const away = teamById(match.awayId);
  const league = leagueById(match.leagueId);
  const market = match.markets.find((m) => m.id === "1x2") ?? match.markets[0]!;
  const disabled = market.status !== "ACTIVE" || isMatchLocked(match);

  const matchCode = match.code || `#${70000 + (parseInt(match.id.replace(/\D/g, "") || "1") * 17) % 29000}`;
  const extraCount = match.markets.length * 5 + (parseInt(match.id.replace(/\D/g, "") || "1") % 10);

  return (
    <article className="bg-[#18181b] border border-[#27272a] rounded-xl p-3 sm:p-3.5 transition-all hover:border-[#3f3f46]">
      {/* Top row: Kickoff time, match code, league name, trend arrow */}
      <div className="flex items-center justify-between text-xs text-[#a1a1aa] mb-2 font-mono">
        <div className="flex items-center gap-2 font-medium">
          <span className="font-extrabold text-white">{formatKickoff(match.kickoff)}</span>
          <span className="text-[#71717a] font-normal">{matchCode}</span>
          <span className="truncate max-w-[150px] sm:max-w-[200px] text-[#a1a1aa] font-sans font-semibold">
            {league.name}
          </span>
        </div>
        <TrendingUp className="w-3.5 h-3.5 text-[#71717a] shrink-0" />
      </div>

      {/* Main content row: Teams on left, Odds buttons on right */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        {/* Teams info */}
        <Link
          to="/match/$matchId"
          params={{ matchId: match.id }}
          className="min-w-0 block outline-none group"
        >
          <div className="space-y-0.5">
            <h3 className="truncate text-sm sm:text-base font-extrabold text-white tracking-tight group-hover:text-[#eab308] transition-colors">
              {home.name}
            </h3>
            <h3 className="truncate text-sm sm:text-base font-extrabold text-white tracking-tight group-hover:text-[#eab308] transition-colors">
              {away.name}
            </h3>
          </div>
          <p className="text-[11px] font-semibold text-[#a1a1aa] mt-1">
            +{extraCount} ›
          </p>
        </Link>

        {/* 1X2 Odds Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {market.options.map((opt) => {
            const active = isSelected(match.id, market.id, opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                disabled={disabled}
                aria-pressed={active}
                aria-label={`${market.name} ${opt.label} ${opt.multiplier.toFixed(2)}`}
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
                  "grid h-11 w-14 sm:w-16 place-items-center rounded-xl font-extrabold text-sm sm:text-base transition-all duration-150 active:scale-[0.96]",
                  "disabled:cursor-not-allowed disabled:opacity-40",
                  active
                    ? "bg-[#eab308] text-black font-black shadow-[0_0_12px_rgba(234,179,8,0.4)]"
                    : "bg-[#27272a] text-white hover:bg-[#3f3f46] border border-[#3f3f46]/50",
                )}
              >
                {disabled ? <Lock className="h-3.5 w-3.5 text-gray-500" /> : opt.multiplier.toFixed(2)}
              </button>
            );
          })}
        </div>
      </div>
    </article>
  );
}
