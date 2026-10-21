import { useState, useMemo } from "react";
import {
  Plus, Trash2, Trophy, Calendar, Clock, ChevronDown,
  Check, Globe, AlertCircle, Play, CheckCircle2, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useBetrix } from "@/store/betrix";
import { leagues as defaultLeagues } from "@/data/football";
import type { AdminLeague, AdminMatch } from "@/data/adminMatches";

function makeId() {
  return `adm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function LeagueForm({ onAdd }: { onAdd: (l: AdminLeague) => void }) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [color, setColor] = useState("#E41B23");
  const [logoUrl, setLogoUrl] = useState("");

  const handleAdd = () => {
    if (!name.trim()) {
      toast.error("League name is required.");
      return;
    }
    onAdd({
      id: makeId(),
      name: name.trim(),
      country: country.trim() || "International",
      color,
      logoUrl: logoUrl.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
    setName("");
    setCountry("");
    setLogoUrl("");
    toast.success(`League "${name.trim()}" added and ready for matches!`);
  };

  return (
    <div className="bg-[#1e1e26] rounded-2xl border border-[#2a2a35] p-4 space-y-3">
      <h3 className="text-sm font-black text-white flex items-center gap-2">
        <Globe className="h-4 w-4 text-[#E41B23]" /> Add New League
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="League name (e.g. Ghana Premier League) *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="text-xs bg-[#121216] border-[#2a2a35] text-white placeholder:text-gray-500"
        />
        <Input
          placeholder="Country / Region (e.g. Ghana)"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="text-xs bg-[#121216] border-[#2a2a35] text-white placeholder:text-gray-500"
        />
      </div>
      <div className="grid grid-cols-3 gap-2 items-center">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400 font-semibold">Theme Color</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-8 w-12 rounded border border-[#2a2a35] cursor-pointer bg-transparent"
          />
        </div>
        <Input
          placeholder="League Logo URL (optional image link)"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          className="text-xs col-span-2 bg-[#121216] border-[#2a2a35] text-white placeholder:text-gray-500"
        />
      </div>
      <Button
        type="button"
        onClick={handleAdd}
        className="w-full bg-[#E41B23] hover:bg-[#c0141e] text-white text-xs font-black h-8.5"
      >
        <Plus className="h-3.5 w-3.5 mr-1" /> Add League to Platform
      </Button>
    </div>
  );
}

interface SelectableLeague {
  id: string;
  name: string;
  color: string;
  logoUrl?: string | undefined;
}

function MatchForm({
  availableLeagues,
  onAdd,
}: {
  availableLeagues: SelectableLeague[];
  onAdd: (m: AdminMatch) => void;
}) {
  const [leagueId, setLeagueId] = useState(availableLeagues[0]?.id ?? "");
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [homeLogoUrl, setHomeLogoUrl] = useState("");
  const [awayLogoUrl, setAwayLogoUrl] = useState("");
  const [kickoffDate, setKickoffDate] = useState(todayStr());
  const [kickoffTime, setKickoffTime] = useState("15:00");
  const [showLeagueDropdown, setShowLeagueDropdown] = useState(false);

  const selectedLeague = availableLeagues.find((l) => l.id === leagueId) || availableLeagues[0];

  const handleAdd = () => {
    if (!homeTeam.trim() || !awayTeam.trim()) {
      toast.error("Both home and away team names are required.");
      return;
    }
    if (!selectedLeague) {
      toast.error("Please select a league.");
      return;
    }
    if (new Date(`${kickoffDate}T${kickoffTime}:00.000Z`).getTime() <= Date.now()) {
      toast.error("Kickoff must be in the future (Ghana time).");
      return;
    }

    onAdd({
      id: makeId(),
      leagueId: selectedLeague.id,
      homeTeam: homeTeam.trim(),
      awayTeam: awayTeam.trim(),
      homeLogoUrl: homeLogoUrl.trim() || undefined,
      awayLogoUrl: awayLogoUrl.trim() || undefined,
      kickoffDate,
      kickoffTime,
      status: "scheduled",
      createdAt: new Date().toISOString(),
    });

    setHomeTeam("");
    setAwayTeam("");
    setHomeLogoUrl("");
    setAwayLogoUrl("");
    toast.success(`Match "${homeTeam} vs ${awayTeam}" added! It will appear on the platform at ${kickoffTime}.`);
  };

  const inputCls = "text-xs bg-[#121216] border-[#2a2a35] text-white placeholder:text-gray-500";
  const labelCls = "text-[10px] font-bold text-gray-500 uppercase tracking-wide";

  return (
    <div className="bg-[#1e1e26] rounded-2xl border border-[#2a2a35] p-4 space-y-3.5">
      <h3 className="text-sm font-black text-white flex items-center gap-2">
        <Trophy className="h-4 w-4 text-[#E41B23]" /> Schedule & Configure Match
      </h3>

      {/* League Selector */}
      <div className="space-y-1">
        <label className={labelCls}>Competition / League *</label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLeagueDropdown((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold bg-[#121216] border border-[#2a2a35] rounded-lg hover:border-[#F5C400]/40 transition-colors text-white"
          >
            <div className="flex items-center gap-2">
              {selectedLeague?.logoUrl ? (
                <img src={selectedLeague.logoUrl} className="h-4 w-4 rounded-full object-cover" alt="" />
              ) : (
                <div className="h-4 w-4 rounded-full" style={{ backgroundColor: selectedLeague?.color ?? "#E41B23" }} />
              )}
              <span>{selectedLeague?.name ?? "Select league…"}</span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
          </button>
          {showLeagueDropdown && (
            <div className="absolute top-full mt-1 left-0 right-0 z-20 bg-[#1e1e26] border border-[#2a2a35] rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
              {availableLeagues.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => {
                    setLeagueId(l.id);
                    setShowLeagueDropdown(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-[#121216] transition-colors"
                >
                  {l.logoUrl ? (
                    <img src={l.logoUrl} className="h-3.5 w-3.5 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: l.color }} />
                  )}
                  <span>{l.name}</span>
                  {l.id === (selectedLeague?.id || leagueId) && <Check className="h-3 w-3 text-[#F5C400] ml-auto" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Teams and Logos */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className={labelCls}>Home Team *</label>
          <Input
            placeholder="e.g. Hearts of Oak"
            value={homeTeam}
            onChange={(e) => setHomeTeam(e.target.value)}
            className={inputCls}
          />
          <Input
            placeholder="Home Logo URL (optional)"
            value={homeLogoUrl}
            onChange={(e) => setHomeLogoUrl(e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>Away Team *</label>
          <Input
            placeholder="e.g. Asante Kotoko"
            value={awayTeam}
            onChange={(e) => setAwayTeam(e.target.value)}
            className={inputCls}
          />
          <Input
            placeholder="Away Logo URL (optional)"
            value={awayLogoUrl}
            onChange={(e) => setAwayLogoUrl(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className={`${labelCls} flex items-center gap-1`}>
            <Calendar className="h-3 w-3 text-[#F5C400]" /> Kickoff Date (Ghana GMT)
          </label>
          <input
            type="date"
            value={kickoffDate}
            onChange={(e) => setKickoffDate(e.target.value)}
            className="w-full px-2 py-1.5 text-xs border border-[#2a2a35] rounded-lg bg-[#121216] text-white focus:outline-none focus:border-[#F5C400]/50 transition-colors"
          />
        </div>
        <div className="space-y-1">
          <label className={`${labelCls} flex items-center gap-1`}>
            <Clock className="h-3 w-3 text-[#F5C400]" /> Kickoff Time (e.g. 15:00)
          </label>
          <input
            type="time"
            value={kickoffTime}
            onChange={(e) => setKickoffTime(e.target.value)}
            className="w-full px-2 py-1.5 text-xs border border-[#2a2a35] rounded-lg bg-[#121216] text-white focus:outline-none focus:border-[#F5C400]/50 transition-colors"
          />
        </div>
      </div>

      <p className="text-[10px] text-gray-400">
        Odds are generated automatically. After full time, open <strong className="text-gray-200">Platform Matches</strong> and
        enter the real final score to settle bets.
      </p>

      <Button
        type="button"
        onClick={handleAdd}
        className="w-full bg-[#E41B23] hover:bg-[#c0141e] text-white text-xs font-black h-9 shadow-md"
      >
        <Plus className="h-4 w-4 mr-1.5" /> Save Match to Platform
      </Button>
    </div>
  );
}

function FinishMatchForm({ match, onFinish }: { match: AdminMatch; onFinish: (h: number, a: number) => void }) {
  const [home, setHome] = useState(match.homeScore?.toString() ?? "");
  const [away, setAway] = useState(match.awayScore?.toString() ?? "");
  const submit = () => {
    const h = Number(home);
    const a = Number(away);
    if (!/^\d{1,2}$/.test(home) || !/^\d{1,2}$/.test(away)) {
      toast.error("Enter the real final score for both teams.");
      return;
    }
    if (!confirm(`Confirm final score ${match.homeTeam} ${h} – ${a} ${match.awayTeam}? Bets will be settled on this result.`)) return;
    onFinish(h, a);
  };
  return (
    <div className="flex items-center gap-1.5 pt-1">
      <Input value={home} onChange={(e) => setHome(e.target.value)} placeholder="H" className="h-7 w-12 text-center text-xs bg-[#121216] border-[#2a2a35] text-white" />
      <span className="text-gray-500 text-xs">–</span>
      <Input value={away} onChange={(e) => setAway(e.target.value)} placeholder="A" className="h-7 w-12 text-center text-xs bg-[#121216] border-[#2a2a35] text-white" />
      <Button type="button" onClick={submit} className="h-7 px-2 text-[10px] font-black bg-emerald-600 hover:bg-emerald-700 text-white">
        Save final score
      </Button>
    </div>
  );
}

function MatchList({
  matches,
  availableLeagues,
  onDelete,
  onUpdate,
}: {
  matches: AdminMatch[];
  availableLeagues: SelectableLeague[];
  onDelete: (id: string) => void;
  onUpdate: (m: Partial<AdminMatch> & { id: string }) => void;
}) {
  const leagueMap = Object.fromEntries(availableLeagues.map((l) => [l.id, l]));
  const [finishingId, setFinishingId] = useState<string | null>(null);

  const sorted = [...matches].sort((a, b) =>
    new Date(`${a.kickoffDate}T${a.kickoffTime}:00.000Z`).getTime() -
    new Date(`${b.kickoffDate}T${b.kickoffTime}:00.000Z`).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500 text-xs bg-[#1e1e26] rounded-2xl border border-[#2a2a35]">
        <Trophy className="h-8 w-8 mx-auto mb-2 opacity-20 text-[#F5C400]" />
        No matches scheduled yet. Click "Add Match" above to schedule games.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sorted.map((m) => {
        const league = leagueMap[m.leagueId];
        const kickedOff = new Date(`${m.kickoffDate}T${m.kickoffTime}:00.000Z`).getTime() <= Date.now();
        const hasScore = typeof m.homeScore === "number" && typeof m.awayScore === "number";

        return (
          <div
            key={m.id}
            className="bg-[#1e1e26] rounded-xl border border-[#2a2a35] p-3 flex items-start gap-3 hover:border-[#F5C400]/30 transition-colors"
          >
            <div
              className="w-1.5 self-stretch rounded-full shrink-0"
              style={{ backgroundColor: league?.color ?? "#E41B23" }}
            />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 text-[10px] text-gray-400 font-semibold">
                {league?.logoUrl ? (
                  <img src={league.logoUrl} className="h-3.5 w-3.5 rounded-full object-cover" alt="" />
                ) : (
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: league?.color ?? "#E41B23" }} />
                )}
                <span className="font-bold text-gray-300">{league?.name ?? "Custom League"}</span>
                <span>•</span>
                <span className="text-[#F5C400] font-bold">
                  {m.kickoffDate} at {m.kickoffTime} GMT
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm font-black text-white">
                {m.homeLogoUrl ? (
                  <img src={m.homeLogoUrl} className="h-5 w-5 rounded-full object-cover bg-white/10" alt="" />
                ) : null}
                <span className="truncate">{m.homeTeam}</span>
                <span className="text-gray-500 text-xs font-normal">
                  {hasScore ? `${m.homeScore} – ${m.awayScore}` : "vs"}
                </span>
                {m.awayLogoUrl ? (
                  <img src={m.awayLogoUrl} className="h-5 w-5 rounded-full object-cover bg-white/10" alt="" />
                ) : null}
                <span className="truncate">{m.awayTeam}</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1",
                    m.status === "finished"
                      ? "bg-gray-700/50 text-gray-300 border border-gray-600/30"
                      : m.status === "cancelled"
                        ? "bg-red-500/15 text-red-400 border border-red-500/30"
                        : m.status === "live"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse"
                          : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                  )}
                >
                  {m.status === "finished" && (<><CheckCircle2 className="h-3 w-3" /> Finished</>)}
                  {m.status === "cancelled" && (<><XCircle className="h-3 w-3" /> Cancelled — bets void</>)}
                  {m.status === "live" && (<><Play className="h-3 w-3" /> Live</>)}
                  {m.status === "scheduled" && (
                    <><Clock className="h-3 w-3" /> {kickedOff ? "Kicked off — betting closed" : "Scheduled"}</>
                  )}
                </span>
              </div>

              {finishingId === m.id && m.status !== "finished" && (
                <FinishMatchForm
                  match={m}
                  onFinish={(homeScore, awayScore) => {
                    onUpdate({ id: m.id, status: "finished", homeScore, awayScore });
                    setFinishingId(null);
                  }}
                />
              )}
            </div>

            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <button
                type="button"
                title="Delete Match"
                onClick={() => {
                  if (confirm(`Delete "${m.homeTeam} vs ${m.awayTeam}"? Pending bets on it will be voided after 7 days.`)) {
                    onDelete(m.id);
                  }
                }}
                className="p-1.5 rounded-lg text-[#E41B23]/70 hover:bg-[#E41B23]/10 hover:text-[#E41B23] transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>

              {m.status === "scheduled" && kickedOff && (
                <button
                  type="button"
                  onClick={() => onUpdate({ id: m.id, status: "live" })}
                  className="px-2 py-1 rounded-md text-[10px] font-bold bg-[#121216] border border-[#2a2a35] text-gray-400 hover:text-white transition-colors"
                >
                  Mark live
                </button>
              )}
              {(m.status === "scheduled" || m.status === "live") && (
                <>
                  <button
                    type="button"
                    onClick={() => setFinishingId(finishingId === m.id ? null : m.id)}
                    disabled={!kickedOff}
                    title={kickedOff ? "Enter the final score" : "Available after kickoff"}
                    className="px-2 py-1 rounded-md text-[10px] font-bold bg-[#121216] border border-[#2a2a35] text-gray-400 hover:text-white transition-colors disabled:opacity-40"
                  >
                    Finish…
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Cancel "${m.homeTeam} vs ${m.awayTeam}"? All bets on it will be voided and refunded.`)) {
                        onUpdate({ id: m.id, status: "cancelled" });
                      }
                    }}
                    className="px-2 py-1 rounded-md text-[10px] font-bold bg-[#121216] border border-[#2a2a35] text-red-400/80 hover:text-red-400 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AdminMatchManager() {
  const {
    adminLeagues,
    adminMatches,
    addAdminLeague,
    addAdminMatch,
    deleteAdminMatch,
    updateAdminMatch,
    settleNow,
  } = useBetrix();

  const [view, setView] = useState<"matches" | "leagues" | "list">("matches");
  const [settling, setSettling] = useState(false);

  // Combined list of custom admin leagues + standard sports leagues
  const availableLeagues: SelectableLeague[] = useMemo(() => {
    const custom: SelectableLeague[] = adminLeagues.map((l) => ({
      id: l.id,
      name: l.name,
      color: l.color,
      logoUrl: l.logoUrl,
    }));
    const defaults: SelectableLeague[] = defaultLeagues.map((l) => ({
      id: l.id,
      name: l.name,
      color: l.color,
      logoUrl: l.logo,
    }));
    return [...custom, ...defaults];
  }, [adminLeagues]);

  const handleAddLeague = async (l: AdminLeague) => {
    await addAdminLeague(l);
    setView("matches");
  };

  const handleAddMatch = async (m: AdminMatch) => {
    await addAdminMatch(m);
    setView("list");
  };

  const handleUpdate = async (m: Partial<AdminMatch> & { id: string }) => {
    await updateAdminMatch(m);
    if (m.status === "finished" || m.status === "cancelled") {
      setSettling(true);
      try {
        const n = await settleNow("all");
        toast.success(`Match updated. ${n} bet slip(s) settled.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Settlement failed — try again from the list.");
      } finally {
        setSettling(false);
      }
    } else {
      toast.success("Match updated.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["matches", "list", "leagues"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setView(tab)}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-black transition-all border",
              view === tab
                ? "bg-[#E41B23] text-white border-[#E41B23] shadow-sm"
                : "bg-[#1e1e26] text-gray-400 border-[#2a2a35] hover:text-white hover:border-[#F5C400]/30"
            )}
          >
            {tab === "matches" && "Add Match"}
            {tab === "list" && `Platform Matches (${adminMatches.length})`}
            {tab === "leagues" && `Custom Leagues (${adminLeagues.length})`}
          </button>
        ))}
        <Button
          type="button"
          variant="outline"
          disabled={settling}
          onClick={async () => {
            setSettling(true);
            try {
              const n = await settleNow("all");
              toast.success(`${n} bet slip(s) settled.`);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Settlement failed.");
            } finally {
              setSettling(false);
            }
          }}
          className="ml-auto h-8 text-xs font-bold border-[#2a2a35] bg-[#1e1e26] text-gray-300 hover:text-white"
        >
          {settling ? "Settling…" : "Settle finished bets"}
        </Button>
      </div>

      {view === "matches" && (
        <MatchForm availableLeagues={availableLeagues} onAdd={handleAddMatch} />
      )}

      {view === "list" && (
        <MatchList
          matches={adminMatches}
          availableLeagues={availableLeagues}
          onDelete={deleteAdminMatch}
          onUpdate={handleUpdate}
        />
      )}

      {view === "leagues" && <LeagueForm onAdd={handleAddLeague} />}

      <div className="text-[11px] text-gray-400 bg-[#1e1e26] border border-[#2a2a35] rounded-xl p-3 flex items-start gap-2.5">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#F5C400]" />
        <div>
          <span className="font-bold text-white">How platform matches work:</span> Matches open for betting until the
          stated kickoff time (Ghana GMT), then betting closes automatically. After the game, use{" "}
          <span className="text-gray-200 font-bold">Finish…</span> to enter the real final score — bets settle on that
          result. <span className="text-gray-200 font-bold">Cancel</span> voids every bet and refunds the stakes.
        </div>
      </div>
    </div>
  );
}
