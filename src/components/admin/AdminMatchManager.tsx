import { useState, useMemo } from "react";
import {
  Plus, Trash2, Trophy, Calendar, Clock, ChevronDown,
  Shield, Check, Globe, AlertCircle, RefreshCw, Play, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useBetrix } from "@/store/betrix";
import { leagues as defaultLeagues, type League } from "@/data/football";
import type { AdminLeague, AdminMatch } from "@/data/adminMatches";

const OUTCOME_LABELS: Record<string, string> = {
  home: "Home Win",
  draw: "Draw",
  away: "Away Win",
  score: "Exact Score",
};

const OUTCOME_COLORS: Record<string, string> = {
  home: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  draw: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  away: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  score: "bg-[#F5C400]/15 text-[#F5C400] border-[#F5C400]/30",
};

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
    if (!name.trim()) return toast.error("League name is required.");
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
  logoUrl?: string;
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
  const [outcome, setOutcome] = useState<"home" | "draw" | "away" | "score">("home");
  const [outcomeScore, setOutcomeScore] = useState("2:1");
  const [status, setStatus] = useState<"scheduled" | "live" | "finished">("scheduled");
  const [showLeagueDropdown, setShowLeagueDropdown] = useState(false);

  const selectedLeague = availableLeagues.find((l) => l.id === leagueId) || availableLeagues[0];

  const handleAdd = () => {
    if (!homeTeam.trim() || !awayTeam.trim()) {
      return toast.error("Both home and away team names are required.");
    }
    if (!selectedLeague) {
      return toast.error("Please select a league.");
    }
    if (outcome === "score" && !/^\d+:\d+$/.test(outcomeScore.trim())) {
      return toast.error("Score format must be like '2:1'.");
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
      outcome,
      outcomeScore: outcomeScore.trim() || (outcome === "home" ? "2:1" : outcome === "draw" ? "1:1" : "0:2"),
      status,
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

      {/* Predetermined Outcome & Exact Score */}
      <div className="space-y-2">
        <label className={`${labelCls} flex items-center gap-1`}>
          <Shield className="h-3 w-3 text-[#E41B23]" /> Predetermined Outcome (Will end as specified)
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {(["home", "draw", "away", "score"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setOutcome(opt)}
              className={cn(
                "py-1.5 rounded-lg text-[10px] font-black border transition-all",
                outcome === opt
                  ? "bg-[#E41B23] text-white border-[#E41B23]"
                  : "bg-[#121216] text-gray-400 border-[#2a2a35] hover:border-[#F5C400]/30 hover:text-gray-200"
              )}
            >
              {OUTCOME_LABELS[opt]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-1 bg-[#121216] p-2 rounded-xl border border-[#2a2a35]">
          <label className="text-xs text-gray-300 font-bold whitespace-nowrap">Target Final Score:</label>
          <Input
            placeholder="e.g. 2:1"
            value={outcomeScore}
            onChange={(e) => setOutcomeScore(e.target.value)}
            className="text-xs bg-[#1e1e26] border-[#2a2a35] text-white max-w-[80px] text-center font-mono font-bold"
          />
          <span className="text-[10px] text-gray-400">
            {outcome === "home" && "(Home goals > Away goals)"}
            {outcome === "draw" && "(Scores are level)"}
            {outcome === "away" && "(Away goals > Home goals)"}
            {outcome === "score" && "(Exact final score at 90')"}
          </span>
        </div>
      </div>

      {/* Status Mode */}
      <div className="space-y-1.5">
        <label className={labelCls}>Status Simulation Mode</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "scheduled", label: "⏱ Time-Based (Auto)" },
            { id: "live", label: "⚡ Force Live Now" },
            { id: "finished", label: "✓ Force Finished" },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStatus(st.id as any)}
              className={cn(
                "py-1.5 rounded-lg text-[10px] font-black border transition-all",
                status === st.id
                  ? "bg-[#F5C400] text-black border-[#F5C400]"
                  : "bg-[#121216] text-gray-400 border-[#2a2a35] hover:text-gray-200"
              )}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

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

function MatchList({
  matches,
  availableLeagues,
  onDelete,
  onToggleStatus,
}: {
  matches: AdminMatch[];
  availableLeagues: SelectableLeague[];
  onDelete: (id: string) => void;
  onToggleStatus: (id: string) => void;
}) {
  const leagueMap = Object.fromEntries(availableLeagues.map((l) => [l.id, l]));

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
        const kickoff = new Date(`${m.kickoffDate}T${m.kickoffTime}:00.000Z`);
        const now = new Date();
        const isPast = kickoff.getTime() + 105 * 60 * 1000 <= now.getTime();
        const isLiveTime = kickoff <= now && !isPast;

        const effectiveStatus = m.status === "finished" ? "finished"
          : m.status === "live" ? "live"
          : isPast ? "finished"
          : isLiveTime ? "live"
          : "scheduled";

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
                <span className="text-gray-500 text-xs font-normal">vs</span>
                {m.awayLogoUrl ? (
                  <img src={m.awayLogoUrl} className="h-5 w-5 rounded-full object-cover bg-white/10" alt="" />
                ) : null}
                <span className="truncate">{m.awayTeam}</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full border", OUTCOME_COLORS[m.outcome])}>
                  Target: {m.outcomeScore || OUTCOME_LABELS[m.outcome]}
                </span>

                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1",
                    effectiveStatus === "finished"
                      ? "bg-gray-700/50 text-gray-300 border border-gray-600/30"
                      : effectiveStatus === "live"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse"
                      : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                  )}
                >
                  {effectiveStatus === "finished" && (
                    <>
                      <CheckCircle2 className="h-3 w-3 text-gray-400" /> Finished ({m.outcomeScore})
                    </>
                  )}
                  {effectiveStatus === "live" && (
                    <>
                      <Play className="h-3 w-3 text-emerald-400" /> In-Play Live
                    </>
                  )}
                  {effectiveStatus === "scheduled" && (
                    <>
                      <Clock className="h-3 w-3 text-blue-400" /> Scheduled for stated time
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <button
                type="button"
                title="Delete Match"
                onClick={() => {
                  if (confirm(`Delete "${m.homeTeam} vs ${m.awayTeam}"?`)) {
                    onDelete(m.id);
                    toast.success("Match deleted from platform.");
                  }
                }}
                className="p-1.5 rounded-lg text-[#E41B23]/70 hover:bg-[#E41B23]/10 hover:text-[#E41B23] transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                title="Cycle Status (Scheduled -> Live -> Finished)"
                onClick={() => onToggleStatus(m.id)}
                className="px-2 py-1 rounded-md text-[10px] font-bold bg-[#121216] border border-[#2a2a35] text-gray-400 hover:text-white hover:border-[#F5C400]/40 transition-colors flex items-center gap-1"
              >
                <RefreshCw className="h-2.5 w-2.5" /> Switch
              </button>
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
    deleteAdminLeague,
    addAdminMatch,
    deleteAdminMatch,
    updateAdminMatch,
  } = useBetrix();

  const [view, setView] = useState<"matches" | "leagues" | "list">("matches");

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
      logoUrl: (l as any).logo,
    }));
    return [...custom, ...defaults];
  }, [adminLeagues]);

  const handleAddLeague = (l: AdminLeague) => {
    addAdminLeague(l);
    setView("matches");
  };

  const handleAddMatch = (m: AdminMatch) => {
    addAdminMatch(m);
    setView("list");
  };

  const handleToggleStatus = (id: string) => {
    const match = adminMatches.find((m) => m.id === id);
    if (!match) return;
    const nextStatus = match.status === "scheduled" ? "live" : match.status === "live" ? "finished" : "scheduled";
    updateAdminMatch({ id, status: nextStatus });
    toast.info(`Match status set to ${nextStatus.toUpperCase()}`);
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
      </div>

      {view === "matches" && (
        <MatchForm availableLeagues={availableLeagues} onAdd={handleAddMatch} />
      )}

      {view === "list" && (
        <MatchList
          matches={adminMatches}
          availableLeagues={availableLeagues}
          onDelete={deleteAdminMatch}
          onToggleStatus={handleToggleStatus}
        />
      )}

      {view === "leagues" && <LeagueForm onAdd={handleAddLeague} />}

      <div className="text-[11px] text-gray-400 bg-[#1e1e26] border border-[#2a2a35] rounded-xl p-3 flex items-start gap-2.5">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#F5C400]" />
        <div>
          <span className="font-bold text-white">How match automation works:</span> Matches appear on the platform at the stated date and kickoff time. When the scheduled time arrives, the match turns <span className="text-emerald-400 font-bold">LIVE</span> and simulates progress towards the predetermined outcome. At the end (90'), it marks as <span className="text-gray-300 font-bold">FINISHED</span> with your exact target score.
        </div>
      </div>
    </div>
  );
}
