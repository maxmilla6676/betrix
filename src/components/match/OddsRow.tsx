import { Link } from "@tanstack/react-router";
import { Lock, Flame } from "lucide-react";
import { useBetrix } from "@/store/betrix";
import { cn } from "@/lib/utils";
import { formatKickoff, leagueById, teamById, isMatchLocked, type Match } from "@/data/football";

/** Dense sportsbook-style row: teams on the left, odds buttons on the right. */
export function OddsRow({ match, marketId = "1x2" }: { match: Match; marketId?: string }) {
  const { toggleSelection, isSelected } = useBetrix();
  const home = teamById(match.homeId);
  const away = teamById(match.awayId);
  const league = leagueById(match.leagueId);
  const market = match.markets.find((m) => m.id === marketId) ?? match.markets[0]!;
  const disabled = market.status !== "ACTIVE" || isMatchLocked(match);
  const extra = match.markets.length * 6 + 4;
  const live = match.status === "LIVE";

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border/60 px-3 py-2.5 transition-colors last:border-0 hover:bg-surface-2/40">
      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-2 text-[11px] text-muted-foreground">
          {match.hot && !live ? (
            <span className="inline-flex items-center gap-0.5 rounded bg-destructive/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-destructive">
              <Flame className="h-2.5 w-2.5" /> Hot
            </span>
          ) : null}
          {live ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-live">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-live" />
              {match.minute}&apos;
            </span>
          ) : (
            <span className="tabular font-semibold text-foreground/80">{formatKickoff(match.kickoff)}</span>
          )}
          <span className="truncate">{league.name}</span>
        </div>
        <Link
          to="/match/$matchId"
          params={{ matchId: match.id }}
          className="block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <p className="truncate text-sm font-semibold leading-tight">{home.name}</p>
          <p className="truncate text-sm font-semibold leading-tight">{away.name}</p>
          <p className="mt-0.5 text-[11px] font-medium text-primary">+{extra} markets ›</p>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        {match.homeScore != null ? (
          <div className="tabular mr-1 text-right text-sm font-bold leading-tight">
            <p>{match.homeScore}</p>
            <p>{match.awayScore}</p>
          </div>
        ) : null}
        <div className="flex gap-1.5">
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
                  "tabular grid h-11 w-[58px] place-items-center rounded-lg border border-border bg-surface-2/70 text-sm font-bold transition-all duration-150 active:scale-[0.96] sm:w-[68px]",
                  "disabled:cursor-not-allowed disabled:opacity-40",
                  active ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/50",
                )}
              >
                {disabled ? <Lock className="h-3.5 w-3.5" /> : opt.multiplier.toFixed(2)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Column header (1 / X / 2) above a block of odds rows. */
export function OddsHeader({ labels }: { labels: string[] }) {
  return (
    <div className="flex justify-end gap-1.5 px-3 pb-1 pt-2">
      {labels.map((l) => (
        <span key={l} className="w-[58px] text-center text-[11px] font-semibold text-muted-foreground sm:w-[68px]">
          {l}
        </span>
      ))}
    </div>
  );
}
