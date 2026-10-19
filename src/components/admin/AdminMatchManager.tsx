import { useState } from "react";
import {
  Plus, Trash2, Trophy, Calendar, Clock, ChevronDown,
  Shield, Check, Globe, AlertCircle, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface AdminLeague {
  id: string; name: string; country: string;
  color: string; logoUrl: string; createdAt: string;
}

export interface AdminMatch {
  id: string; leagueId: string;
  homeTeam: string; awayTeam: string;
  homeLogoUrl: string; awayLogoUrl: string;
  kickoffDate: string; kickoffTime: string;
  outcome: "home" | "draw" | "away" | "score";
  outcomeScore?: string;
  status: "scheduled" | "live" | "finished";
  createdAt: string;
}

const OUTCOME_LABELS: Record<string, string> = {
  home: "Home Win", draw: "Draw", away: "Away Win", score: "Exact Score",
};

const OUTCOME_COLORS: Record<string, string> = {
  home: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  draw: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  away: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  score: "bg-[#F5C400]/15 text-[#F5C400] border-[#F5C400]/30",
};

function makeId() { return `adm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }
function todayStr() { return new Date().toISOString().slice(0, 10); }

function LeagueForm({ onAdd }: { onAdd: (l: AdminLeague) => void }) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [color, setColor] = useState("#E41B23");
  const [logoUrl, setLogoUrl] = useState("");

  const handleAdd = () => {
    if (!name.trim()) return toast.error("League name is required.");
    onAdd({ id: makeId(), name: name.trim(), country: country.trim() || "International", color, logoUrl: logoUrl.trim(), createdAt: new Date().toISOString() });
    setName(""); setCountry(""); setLogoUrl("");
    toast.success(`League "${name.trim()}" added!`);
  };

  return (
    <div className="bg-[#1e1e26] rounded-2xl border border-[#2a2a35] p-4 space-y-3">
      <h3 className="text-sm font-black text-white flex items-center gap-2">
        <Globe className="h-4 w-4 text-[#E41B23]" /> Add New League
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="League name *" value={name} onChange={(e) => setName(e.target.value)}
          className="text-xs bg-[#121216] border-[#2a2a35] text-white placeholder:text-gray-500" />
        <Input placeholder="Country / Region" value={country} onChange={(e) => setCountry(e.target.value)}
          className="text-xs bg-[#121216] border-[#2a2a35] text-white placeholder:text-gray-500" />
      </div>
      <div className="grid grid-cols-3 gap-2 items-center">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400 font-semibold">Color</label>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
            className="h-7 w-10 rounded border border-[#2a2a35] cursor-pointer bg-transparent" />
        </div>
        <Input placeholder="Logo URL (optional)" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)}
          className="text-xs col-span-2 bg-[#121216] border-[#2a2a35] text-white placeholder:text-gray-500" />
      </div>
      <Button type="button" onClick={handleAdd}
        className="w-full bg-[#E41B23] hover:bg-[#c0141e] text-white text-xs font-black h-8">
        <Plus className="h-3.5 w-3.5 mr-1" /> Add League
      </Button>
    </div>
  );
}

function MatchForm({ leagues, onAdd }: { leagues: AdminLeague[]; onAdd: (m: AdminMatch) => void }) {
  const [leagueId, setLeagueId] = useState(leagues[0]?.id ?? "");
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [homeLogoUrl, setHomeLogoUrl] = useState("");
  const [awayLogoUrl, setAwayLogoUrl] = useState("");
  const [kickoffDate, setKickoffDate] = useState(todayStr());
  const [kickoffTime, setKickoffTime] = useState("15:00");
  const [outcome, setOutcome] = useState<"home" | "draw" | "away" | "score">("home");
  const [outcomeScore, setOutcomeScore] = useState("1:0");
  const [showLeagueDropdown, setShowLeagueDropdown] = useState(false);

  const selectedLeague = leagues.find((l) => l.id === leagueId);

  const handleAdd = () => {
    if (!homeTeam.trim() || !awayTeam.trim()) return toast.error("Both team names are required.");
    if (leagues.length === 0) return toast.error("Add a league first.");
    if (outcome === "score" && !/^\d+:\d+$/.test(outcomeScore.trim())) return toast.error("Score must be like '2:1'.");
    onAdd({ id: makeId(), leagueId, homeTeam: homeTeam.trim(), awayTeam: awayTeam.trim(), homeLogoUrl: homeLogoUrl.trim(), awayLogoUrl: awayLogoUrl.trim(), kickoffDate, kickoffTime, outcome, outcomeScore: outcome === "score" ? outcomeScore.trim() : undefined, status: "scheduled", createdAt: new Date().toISOString() });
    setHomeTeam(""); setAwayTeam(""); setHomeLogoUrl(""); setAwayLogoUrl("");
    toast.success(`"${homeTeam} vs ${awayTeam}" scheduled!`);
  };

  const inputCls = "text-xs bg-[#121216] border-[#2a2a35] text-white placeholder:text-gray-500";
  const labelCls = "text-[10px] font-bold text-gray-500 uppercase tracking-wide";

  return (
    <div className="bg-[#1e1e26] rounded-2xl border border-[#2a2a35] p-4 space-y-3">
      <h3 className="text-sm font-black text-white flex items-center gap-2">
        <Trophy className="h-4 w-4 text-[#E41B23]" /> Schedule a Match
      </h3>

      {leagues.length === 0 ? (
        <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> Add a league first before creating matches.
        </div>
      ) : (
        <>
          {/* League selector */}
          <div className="relative">
            <button type="button" onClick={() => setShowLeagueDropdown((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold bg-[#121216] border border-[#2a2a35] rounded-lg hover:border-[#F5C400]/40 transition-colors text-white">
              <div className="flex items-center gap-2">
                {selectedLeague?.logoUrl
                  ? <img src={selectedLeague.logoUrl} className="h-4 w-4 rounded-full object-cover" alt="" />
                  : <div className="h-4 w-4 rounded-full" style={{ backgroundColor: selectedLeague?.color ?? "#E41B23" }} />}
                <span>{selectedLeague?.name ?? "Select league…"}</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
            </button>
            {showLeagueDropdown && (
              <div className="absolute top-full mt-1 left-0 right-0 z-20 bg-[#1e1e26] border border-[#2a2a35] rounded-xl shadow-xl overflow-hidden max-h-36 overflow-y-auto">
                {leagues.map((l) => (
                  <button key={l.id} type="button" onClick={() => { setLeagueId(l.id); setShowLeagueDropdown(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-[#121216] transition-colors">
                    <div className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: l.color }} />
                    {l.name}
                    {l.id === leagueId && <Check className="h-3 w-3 text-[#F5C400] ml-auto" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Teams */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={labelCls}>Home Team *</label>
              <Input placeholder="e.g. Man United" value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)} className={inputCls} />
              <Input placeholder="Home logo URL" value={homeLogoUrl} onChange={(e) => setHomeLogoUrl(e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Away Team *</label>
              <Input placeholder="e.g. Arsenal" value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)} className={inputCls} />
              <Input placeholder="Away logo URL" value={awayLogoUrl} onChange={(e) => setAwayLogoUrl(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className={`${labelCls} flex items-center gap-1`}><Calendar className="h-3 w-3" /> Date</label>
              <input type="date" value={kickoffDate} min={todayStr()} onChange={(e) => setKickoffDate(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-[#2a2a35] rounded-lg bg-[#121216] text-white focus:outline-none focus:border-[#F5C400]/50 transition-colors" />
            </div>
            <div className="space-y-1">
              <label className={`${labelCls} flex items-center gap-1`}><Clock className="h-3 w-3" /> Kickoff Time</label>
              <input type="time" value={kickoffTime} onChange={(e) => setKickoffTime(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-[#2a2a35] rounded-lg bg-[#121216] text-white focus:outline-none focus:border-[#F5C400]/50 transition-colors" />
            </div>
          </div>

          {/* Outcome */}
          <div className="space-y-2">
            <label className={`${labelCls} flex items-center gap-1`}><Shield className="h-3 w-3" /> Predetermined Outcome</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(["home", "draw", "away", "score"] as const).map((opt) => (
                <button key={opt} type="button" onClick={() => setOutcome(opt)}
                  className={cn("py-1.5 rounded-lg text-[10px] font-black border transition-all",
                    outcome === opt ? "bg-[#E41B23] text-white border-[#E41B23]" : "bg-[#121216] text-gray-400 border-[#2a2a35] hover:border-[#F5C400]/30 hover:text-gray-200")}>
                  {OUTCOME_LABELS[opt]}
                </button>
              ))}
            </div>
            {outcome === "score" && (
              <div className="flex items-center gap-2 pt-1">
                <label className="text-xs text-gray-400 font-semibold whitespace-nowrap">Score:</label>
                <Input placeholder="e.g. 2:1" value={outcomeScore} onChange={(e) => setOutcomeScore(e.target.value)}
                  className={`${inputCls} max-w-[90px]`} />
                <span className="text-[10px] text-gray-500">(Home : Away)</span>
              </div>
            )}
          </div>

          <Button type="button" onClick={handleAdd}
            className="w-full bg-[#E41B23] hover:bg-[#c0141e] text-white text-xs font-black h-8">
            <Plus className="h-3.5 w-3.5 mr-1" /> Schedule Match
          </Button>
        </>
      )}
    </div>
  );
}

function MatchList({ matches, leagues, onDelete, onToggleStatus }: {
  matches: AdminMatch[]; leagues: AdminLeague[];
  onDelete: (id: string) => void; onToggleStatus: (id: string) => void;
}) {
  const leagueMap = Object.fromEntries(leagues.map((l) => [l.id, l]));
  const sorted = [...matches].sort((a, b) =>
    new Date(`${a.kickoffDate}T${a.kickoffTime}`).getTime() - new Date(`${b.kickoffDate}T${b.kickoffTime}`).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500 text-xs bg-[#1e1e26] rounded-2xl border border-[#2a2a35]">
        <Trophy className="h-8 w-8 mx-auto mb-2 opacity-20" />
        No matches scheduled yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sorted.map((m) => {
        const league = leagueMap[m.leagueId];
        const kickoff = new Date(`${m.kickoffDate}T${m.kickoffTime}`);
        const isPast = kickoff < new Date();
        const statusLabel = isPast ? "finished" : m.status;

        return (
          <div key={m.id} className="bg-[#1e1e26] rounded-xl border border-[#2a2a35] p-3 flex items-start gap-3 hover:border-[#F5C400]/20 transition-colors">
            <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: league?.color ?? "#E41B23" }} />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 text-[10px] text-gray-500 font-semibold">
                {league?.logoUrl
                  ? <img src={league.logoUrl} className="h-3 w-3 rounded-full object-cover" alt="" />
                  : <div className="h-3 w-3 rounded-full" style={{ backgroundColor: league?.color ?? "#E41B23" }} />}
                <span>{league?.name ?? "—"}</span>
                <span>•</span>
                <span>{kickoff.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} {m.kickoffTime}</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-black text-white">
                {m.homeLogoUrl && <img src={m.homeLogoUrl} className="h-5 w-5 rounded-full object-cover" alt="" />}
                <span>{m.homeTeam}</span>
                <span className="text-gray-600 text-xs font-normal">vs</span>
                {m.awayLogoUrl && <img src={m.awayLogoUrl} className="h-5 w-5 rounded-full object-cover" alt="" />}
                <span>{m.awayTeam}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full border", OUTCOME_COLORS[m.outcome])}>
                  {m.outcome === "score" ? `Score: ${m.outcomeScore}` : OUTCOME_LABELS[m.outcome]}
                </span>
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
                  statusLabel === "finished" ? "bg-gray-700/50 text-gray-400"
                  : statusLabel === "live" ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-blue-500/10 text-blue-400")}>
                  {statusLabel === "finished" ? "✓ Finished" : statusLabel === "live" ? "⚡ Live" : "⏱ Scheduled"}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <button type="button"
                onClick={() => { if (confirm(`Delete "${m.homeTeam} vs ${m.awayTeam}"?`)) { onDelete(m.id); toast.success("Match deleted."); } }}
                className="p-1.5 rounded-lg text-[#E41B23]/70 hover:bg-[#E41B23]/10 hover:text-[#E41B23] transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => onToggleStatus(m.id)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-[#121216] hover:text-gray-300 transition-colors">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AdminMatchManager() {
  const [leagues, setLeagues] = useState<AdminLeague[]>([]);
  const [matches, setMatches] = useState<AdminMatch[]>([]);
  const [view, setView] = useState<"leagues" | "matches" | "list">("leagues");

  const handleAddLeague = (l: AdminLeague) => { setLeagues((prev) => [...prev, l]); setView("matches"); };
  const handleAddMatch = (m: AdminMatch) => { setMatches((prev) => [...prev, m]); setView("list"); };
  const handleDeleteMatch = (id: string) => setMatches((prev) => prev.filter((m) => m.id !== id));
  const handleToggleStatus = (id: string) =>
    setMatches((prev) => prev.map((m) => m.id === id ? { ...m, status: m.status === "live" ? "scheduled" : "live" } : m));

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["leagues", "matches", "list"] as const).map((tab) => (
          <button key={tab} type="button" onClick={() => setView(tab)}
            className={cn("px-4 py-1.5 rounded-full text-xs font-black transition-all border",
              view === tab
                ? "bg-[#E41B23] text-white border-[#E41B23]"
                : "bg-[#1e1e26] text-gray-400 border-[#2a2a35] hover:text-white hover:border-[#F5C400]/30")}>
            {tab === "leagues" && `Leagues (${leagues.length})`}
            {tab === "matches" && "Add Match"}
            {tab === "list" && `Scheduled (${matches.length})`}
          </button>
        ))}
      </div>

      {view === "leagues" && <LeagueForm onAdd={handleAddLeague} />}
      {view === "matches" && <MatchForm leagues={leagues} onAdd={handleAddMatch} />}
      {view === "list" && <MatchList matches={matches} leagues={leagues} onDelete={handleDeleteMatch} onToggleStatus={handleToggleStatus} />}

      <div className="text-[10px] text-gray-500 bg-[#1e1e26] border border-[#2a2a35] rounded-xl px-3 py-2 flex items-start gap-2">
        <AlertCircle className="h-3 w-3 shrink-0 mt-0.5 text-[#F5C400]/70" />
        Matches appear on the platform at the specified kickoff time. The predetermined outcome is recorded automatically when the match time passes.
      </div>
    </div>
  );
}
