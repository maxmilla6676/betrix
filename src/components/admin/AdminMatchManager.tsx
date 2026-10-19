import { useState } from "react";
import {
  Plus,
  Trash2,
  Trophy,
  Calendar,
  Clock,
  ChevronDown,
  Shield,
  Check,
  Globe,
  AlertCircle,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface AdminLeague {
  id: string;
  name: string;
  country: string;
  color: string;
  logoUrl: string;
  createdAt: string;
}

export interface AdminMatch {
  id: string;
  leagueId: string;
  homeTeam: string;
  awayTeam: string;
  homeLogoUrl: string;
  awayLogoUrl: string;
  kickoffDate: string;
  kickoffTime: string;
  outcome: "home" | "draw" | "away" | "score";
  outcomeScore?: string;
  status: "scheduled" | "live" | "finished";
  createdAt: string;
}

const OUTCOME_LABELS: Record<string, string> = {
  home: "Home Win",
  draw: "Draw",
  away: "Away Win",
  score: "Exact Score",
};

const OUTCOME_COLORS: Record<string, string> = {
  home: "bg-emerald-100 text-emerald-700 border-emerald-200",
  draw: "bg-amber-100 text-amber-700 border-amber-200",
  away: "bg-blue-100 text-blue-700 border-blue-200",
  score: "bg-purple-100 text-purple-700 border-purple-200",
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
  const [color, setColor] = useState("#e11d48");
  const [logoUrl, setLogoUrl] = useState("");

  const handleAdd = () => {
    if (!name.trim()) return toast.error("League name is required.");
    onAdd({
      id: makeId(),
      name: name.trim(),
      country: country.trim() || "International",
      color,
      logoUrl: logoUrl.trim(),
      createdAt: new Date().toISOString(),
    });
    setName(""); setCountry(""); setLogoUrl("");
    toast.success(`League "${name.trim()}" added!`);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4 space-y-3">
      <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">
        <Globe className="h-4 w-4 text-red-500" /> Add New League
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="League name *" value={name} onChange={(e) => setName(e.target.value)} className="text-xs" />
        <Input placeholder="Country / Region" value={country} onChange={(e) => setCountry(e.target.value)} className="text-xs" />
      </div>
      <div className="grid grid-cols-3 gap-2 items-center">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-semibold">Color</label>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-7 w-10 rounded border border-gray-200 cursor-pointer" />
        </div>
        <Input placeholder="Logo URL (optional)" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className="text-xs col-span-2" />
      </div>
      <Button type="button" onClick={handleAdd} className="w-full bg-[#e11d48] hover:bg-[#be123c] text-white text-xs font-black h-8">
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
    if (leagues.length === 0) return toast.error("Add a league first, then create a match.");
    if (outcome === "score" && !/^\d+:\d+$/.test(outcomeScore.trim())) return toast.error("Exact score must be like '2:1'.");

    onAdd({
      id: makeId(), leagueId,
      homeTeam: homeTeam.trim(), awayTeam: awayTeam.trim(),
      homeLogoUrl: homeLogoUrl.trim(), awayLogoUrl: awayLogoUrl.trim(),
      kickoffDate, kickoffTime, outcome,
      outcomeScore: outcome === "score" ? outcomeScore.trim() : undefined,
      status: "scheduled", createdAt: new Date().toISOString(),
    });
    setHomeTeam(""); setAwayTeam(""); setHomeLogoUrl(""); setAwayLogoUrl("");
    toast.success(`"${homeTeam} vs ${awayTeam}" scheduled!`);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4 space-y-3">
      <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-red-500" /> Schedule a Match
      </h3>

      {leagues.length === 0 ? (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> Add a league first before creating matches.
        </div>
      ) : (
        <>
          {/* League selector */}
          <div className="relative">
            <button type="button" onClick={() => setShowLeagueDropdown((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-2">
                {selectedLeague?.logoUrl
                  ? <img src={selectedLeague.logoUrl} className="h-4 w-4 rounded-full object-cover" alt="" />
                  : <div className="h-4 w-4 rounded-full" style={{ backgroundColor: selectedLeague?.color ?? "#e11d48" }} />}
                <span>{selectedLeague?.name ?? "Select league…"}</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            </button>
            {showLeagueDropdown && (
              <div className="absolute top-full mt-1 left-0 right-0 z-20 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-36 overflow-y-auto">
                {leagues.map((l) => (
                  <button key={l.id} type="button" onClick={() => { setLeagueId(l.id); setShowLeagueDropdown(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold hover:bg-gray-50 transition-colors">
                    <div className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: l.color }} />
                    {l.name}
                    {l.id === leagueId && <Check className="h-3 w-3 text-green-500 ml-auto" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Teams */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Home Team *</label>
              <Input placeholder="e.g. Man United" value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)} className="text-xs" />
              <Input placeholder="Home logo URL" value={homeLogoUrl} onChange={(e) => setHomeLogoUrl(e.target.value)} className="text-xs" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Away Team *</label>
              <Input placeholder="e.g. Arsenal" value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)} className="text-xs" />
              <Input placeholder="Away logo URL" value={awayLogoUrl} onChange={(e) => setAwayLogoUrl(e.target.value)} className="text-xs" />
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1"><Calendar className="h-3 w-3" /> Date</label>
              <input type="date" value={kickoffDate} min={todayStr()} onChange={(e) => setKickoffDate(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-red-400 transition-colors" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1"><Clock className="h-3 w-3" /> Kickoff Time</label>
              <input type="time" value={kickoffTime} onChange={(e) => setKickoffTime(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-red-400 transition-colors" />
            </div>
          </div>

          {/* Outcome */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1"><Shield className="h-3 w-3" /> Predetermined Outcome</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(["home", "draw", "away", "score"] as const).map((opt) => (
                <button key={opt} type="button" onClick={() => setOutcome(opt)}
                  className={cn("py-1.5 rounded-lg text-[10px] font-black border transition-all",
                    outcome === opt ? "bg-[#e11d48] text-white border-[#be123c]" : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100")}>
                  {OUTCOME_LABELS[opt]}
                </button>
              ))}
            </div>
            {outcome === "score" && (
              <div className="flex items-center gap-2 pt-1">
                <label className="text-xs text-gray-500 font-semibold whitespace-nowrap">Score:</label>
                <Input placeholder="e.g. 2:1" value={outcomeScore} onChange={(e) => setOutcomeScore(e.target.value)} className="text-xs max-w-[90px]" />
                <span className="text-[10px] text-gray-400">(Home : Away)</span>
              </div>
            )}
          </div>

          <Button type="button" onClick={handleAdd} className="w-full bg-[#e11d48] hover:bg-[#be123c] text-white text-xs font-black h-8">
            <Plus className="h-3.5 w-3.5 mr-1" /> Schedule Match
          </Button>
        </>
      )}
    </div>
  );
}

function MatchList({ matches, leagues, onDelete, onToggleStatus }: {
  matches: AdminMatch[];
  leagues: AdminLeague[];
  onDelete: (id: string) => void;
  onToggleStatus: (id: string) => void;
}) {
  const leagueMap = Object.fromEntries(leagues.map((l) => [l.id, l]));
  const sorted = [...matches].sort((a, b) =>
    new Date(`${a.kickoffDate}T${a.kickoffTime}`).getTime() - new Date(`${b.kickoffDate}T${b.kickoffTime}`).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 text-xs bg-white rounded-2xl border border-gray-100">
        <Trophy className="h-8 w-8 mx-auto mb-2 opacity-30" />
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
          <div key={m.id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-start gap-3 shadow-xs">
            <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: league?.color ?? "#e11d48" }} />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 text-[10px] text-gray-400 font-semibold">
                {league?.logoUrl
                  ? <img src={league.logoUrl} className="h-3 w-3 rounded-full object-cover" alt="" />
                  : <div className="h-3 w-3 rounded-full" style={{ backgroundColor: league?.color ?? "#e11d48" }} />}
                <span>{league?.name ?? "—"}</span>
                <span>•</span>
                <span>{kickoff.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} {m.kickoffTime}</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-black text-gray-900">
                {m.homeLogoUrl && <img src={m.homeLogoUrl} className="h-5 w-5 rounded-full object-cover" alt="" />}
                <span>{m.homeTeam}</span>
                <span className="text-gray-300 text-xs font-normal">vs</span>
                {m.awayLogoUrl && <img src={m.awayLogoUrl} className="h-5 w-5 rounded-full object-cover" alt="" />}
                <span>{m.awayTeam}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full border", OUTCOME_COLORS[m.outcome])}>
                  {m.outcome === "score" ? `Score: ${m.outcomeScore}` : OUTCOME_LABELS[m.outcome]}
                </span>
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
                  statusLabel === "finished" ? "bg-gray-100 text-gray-500"
                  : statusLabel === "live" ? "bg-green-100 text-green-700"
                  : "bg-blue-50 text-blue-600")}>
                  {statusLabel === "finished" ? "✓ Finished" : statusLabel === "live" ? "⚡ Live" : "⏱ Scheduled"}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <button type="button" onClick={() => { if (confirm(`Delete "${m.homeTeam} vs ${m.awayTeam}"?`)) { onDelete(m.id); toast.success("Match deleted."); } }}
                className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors" title="Delete">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => onToggleStatus(m.id)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors" title="Toggle live/scheduled">
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
              view === tab ? "bg-[#e11d48] text-white border-[#be123c]" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50")}>
            {tab === "leagues" && `Leagues (${leagues.length})`}
            {tab === "matches" && "Add Match"}
            {tab === "list" && `Scheduled (${matches.length})`}
          </button>
        ))}
      </div>

      {view === "leagues" && <LeagueForm onAdd={handleAddLeague} />}
      {view === "matches" && <MatchForm leagues={leagues} onAdd={handleAddMatch} />}
      {view === "list" && <MatchList matches={matches} leagues={leagues} onDelete={handleDeleteMatch} onToggleStatus={handleToggleStatus} />}

      <div className="text-[10px] text-gray-400 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 flex items-start gap-2">
        <AlertCircle className="h-3 w-3 shrink-0 mt-0.5 text-amber-500" />
        Matches appear on the platform at the specified kickoff time. The predetermined outcome is recorded automatically when the match time passes.
      </div>
    </div>
  );
}
