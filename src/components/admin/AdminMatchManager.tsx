import { useState, useMemo } from "react";
import {
  Plus, Trash2, Trophy, Calendar, Clock, ChevronDown,
  Check, Globe, AlertCircle, Play, CheckCircle2, XCircle,
  Target, FastForward, Edit3, Sliders, Sparkles, Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useBetrix } from "@/store/betrix";
import { leagues as defaultLeagues } from "@/data/football";
import {
  type AdminLeague,
  type AdminMatch,
  type AdminMatchOutcome,
  computeAdminMatchLiveState,
  parseAdminMatchOutcome,
} from "@/data/adminMatches";

function makeId() {
  return `adm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function currentTimeStr(addMinutes = 5) {
  const d = new Date(Date.now() + addMinutes * 60000);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function LeagueForm({ onAdd }: { onAdd: (l: AdminLeague) => void }) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [color, setColor] = useState("#E41B23");
  const [logoUrl, setLogoUrl] = useState("");
  const [defaultOutcome, setDefaultOutcome] = useState<AdminMatchOutcome>("home");
  const [defaultHomeScore, setDefaultHomeScore] = useState(2);
  const [defaultAwayScore, setDefaultAwayScore] = useState(1);
  const [enableDefaultTarget, setEnableDefaultTarget] = useState(false);

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
      defaultOutcome: enableDefaultTarget ? defaultOutcome : undefined,
      defaultOutcomeScore: enableDefaultTarget
        ? `${defaultHomeScore}-${defaultAwayScore}`
        : undefined,
      defaultHomeScore: enableDefaultTarget ? defaultHomeScore : undefined,
      defaultAwayScore: enableDefaultTarget ? defaultAwayScore : undefined,
      createdAt: new Date().toISOString(),
    });
    setName("");
    setCountry("");
    setLogoUrl("");
    setEnableDefaultTarget(false);
    toast.success(`League "${name.trim()}" added and ready for matches!`);
  };

  return (
    <div className="bg-[#1e1e26] rounded-2xl border border-[#2a2a35] p-4 space-y-3.5 shadow-xl">
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

      {/* Default Target Outcome Toggle */}
      <div className="pt-2 border-t border-[#2a2a35]/60 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-300">
            <Target className="h-3.5 w-3.5 text-[#F5C400]" /> Default Target Outcome for Matches in this League
          </div>
          <button
            type="button"
            onClick={() => setEnableDefaultTarget((v) => !v)}
            className={cn(
              "text-[10px] font-black px-2.5 py-1 rounded-full border transition-all",
              enableDefaultTarget
                ? "bg-[#F5C400]/20 text-[#F5C400] border-[#F5C400]/40"
                : "bg-[#121216] text-gray-400 border-[#2a2a35] hover:text-white"
            )}
          >
            {enableDefaultTarget ? "Active" : "Optional (Off)"}
          </button>
        </div>

        {enableDefaultTarget && (
          <div className="p-3 bg-[#121216] rounded-xl border border-[#2a2a35] space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400 font-semibold">Outcome:</span>
              {(["home", "draw", "away"] as const).map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => {
                    setDefaultOutcome(o);
                    if (o === "home" && defaultHomeScore <= defaultAwayScore) {
                      setDefaultHomeScore(2);
                      setDefaultAwayScore(1);
                    } else if (o === "draw" && defaultHomeScore !== defaultAwayScore) {
                      setDefaultHomeScore(1);
                      setDefaultAwayScore(1);
                    } else if (o === "away" && defaultHomeScore >= defaultAwayScore) {
                      setDefaultHomeScore(0);
                      setDefaultAwayScore(2);
                    }
                  }}
                  className={cn(
                    "text-[10px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-wider transition-all",
                    defaultOutcome === o
                      ? "bg-[#E41B23] text-white border-[#E41B23]"
                      : "bg-[#1e1e26] text-gray-400 border-[#2a2a35] hover:text-white"
                  )}
                >
                  {o === "home" ? "Home Win" : o === "away" ? "Away Win" : "Draw"}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400 font-semibold">Default Score:</span>
              <Input
                type="number"
                min={0}
                max={9}
                value={defaultHomeScore}
                onChange={(e) => setDefaultHomeScore(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-14 h-7 text-center text-xs bg-[#1e1e26] border-[#2a2a35] text-white font-bold"
              />
              <span className="text-gray-500 font-bold">-</span>
              <Input
                type="number"
                min={0}
                max={9}
                value={defaultAwayScore}
                onChange={(e) => setDefaultAwayScore(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-14 h-7 text-center text-xs bg-[#1e1e26] border-[#2a2a35] text-white font-bold"
              />
            </div>
          </div>
        )}
      </div>

      <Button
        type="button"
        onClick={handleAdd}
        className="w-full bg-[#E41B23] hover:bg-[#c0141e] text-white text-xs font-black h-8.5 shadow-md"
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
  defaultOutcome?: AdminMatchOutcome | undefined;
  defaultHomeScore?: number | undefined;
  defaultAwayScore?: number | undefined;
}

const COMMON_PRESETS = {
  home: [
    { h: 1, a: 0 },
    { h: 2, a: 0 },
    { h: 2, a: 1 },
    { h: 3, a: 0 },
    { h: 3, a: 1 },
    { h: 3, a: 2 },
  ],
  draw: [
    { h: 0, a: 0 },
    { h: 1, a: 1 },
    { h: 2, a: 2 },
    { h: 3, a: 3 },
  ],
  away: [
    { h: 0, a: 1 },
    { h: 0, a: 2 },
    { h: 1, a: 2 },
    { h: 0, a: 3 },
    { h: 1, a: 3 },
    { h: 2, a: 3 },
  ],
};

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
  const [kickoffTime, setKickoffTime] = useState(currentTimeStr(5));
  const [showLeagueDropdown, setShowLeagueDropdown] = useState(false);

  // Target Outcome State
  const [targetOutcome, setTargetOutcome] = useState<AdminMatchOutcome>("home");
  const [targetHomeScore, setTargetHomeScore] = useState<number>(2);
  const [targetAwayScore, setTargetAwayScore] = useState<number>(1);
  const [durationMinutes, setDurationMinutes] = useState<number>(90);

  const selectedLeague = availableLeagues.find((l) => l.id === leagueId) || availableLeagues[0];

  const handleSelectLeague = (l: SelectableLeague) => {
    setLeagueId(l.id);
    setShowLeagueDropdown(false);
    if (l.defaultOutcome) {
      setTargetOutcome(l.defaultOutcome);
      if (typeof l.defaultHomeScore === "number") setTargetHomeScore(l.defaultHomeScore);
      if (typeof l.defaultAwayScore === "number") setTargetAwayScore(l.defaultAwayScore);
    }
  };

  const handleWinnerChange = (winner: AdminMatchOutcome) => {
    setTargetOutcome(winner);
    if (winner === "home" && targetHomeScore <= targetAwayScore) {
      setTargetHomeScore(2);
      setTargetAwayScore(1);
    } else if (winner === "draw" && targetHomeScore !== targetAwayScore) {
      setTargetHomeScore(1);
      setTargetAwayScore(1);
    } else if (winner === "away" && targetHomeScore >= targetAwayScore) {
      setTargetHomeScore(0);
      setTargetAwayScore(2);
    }
  };

  const handleSetScore = (h: number, a: number) => {
    setTargetHomeScore(h);
    setTargetAwayScore(a);
    if (h > a) setTargetOutcome("home");
    else if (a > h) setTargetOutcome("away");
    else setTargetOutcome("draw");
  };

  const handleAdd = () => {
    if (!homeTeam.trim() || !awayTeam.trim()) {
      toast.error("Both home and away team names are required.");
      return;
    }
    if (!selectedLeague) {
      toast.error("Please select a league.");
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
      outcome: targetOutcome,
      outcomeScore: `${targetHomeScore}-${targetAwayScore}:${durationMinutes}`,
      targetOutcome,
      targetHomeScore,
      targetAwayScore,
      durationMinutes,
      createdAt: new Date().toISOString(),
    });

    setHomeTeam("");
    setAwayTeam("");
    setHomeLogoUrl("");
    setAwayLogoUrl("");
    toast.success(
      `Match "${homeTeam} vs ${awayTeam}" added with Target Outcome ${targetHomeScore} - ${targetAwayScore}!`
    );
  };

  const inputCls = "text-xs bg-[#121216] border-[#2a2a35] text-white placeholder:text-gray-500";
  const labelCls = "text-[10px] font-bold text-gray-500 uppercase tracking-wide";

  return (
    <div className="bg-[#1e1e26] rounded-2xl border border-[#2a2a35] p-4.5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-white flex items-center gap-2">
          <Trophy className="h-4 w-4 text-[#E41B23]" /> Schedule Match with Target Outcome
        </h3>
        <span className="text-[10px] font-black text-[#F5C400] bg-[#F5C400]/10 border border-[#F5C400]/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> Exact Final Score Guaranteed
        </span>
      </div>

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
            <div className="absolute top-full mt-1 left-0 right-0 z-30 bg-[#1e1e26] border border-[#2a2a35] rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
              {availableLeagues.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => handleSelectLeague(l)}
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
            className="w-full px-2.5 py-1.5 text-xs border border-[#2a2a35] rounded-lg bg-[#121216] text-white focus:outline-none focus:border-[#F5C400]/50 transition-colors"
          />
        </div>
        <div className="space-y-1">
          <label className={`${labelCls} flex items-center justify-between`}>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-[#F5C400]" /> Kickoff Time (GMT)
            </span>
            <button
              type="button"
              onClick={() => {
                setKickoffDate(todayStr());
                setKickoffTime(currentTimeStr(2));
              }}
              className="text-[9px] text-[#F5C400] hover:underline"
            >
              Set +2 mins
            </button>
          </label>
          <input
            type="time"
            value={kickoffTime}
            onChange={(e) => setKickoffTime(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs border border-[#2a2a35] rounded-lg bg-[#121216] text-white focus:outline-none focus:border-[#F5C400]/50 transition-colors"
          />
        </div>
      </div>

      {/* ── TARGET OUTCOME SCRIPTING SECTION ── */}
      <div className="bg-[#121216] rounded-xl border-2 border-[#F5C400]/30 p-3.5 space-y-3 shadow-inner">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-[#F5C400]/20 flex items-center justify-center text-[#F5C400]">
              <Target className="h-3.5 w-3.5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white">Target Outcome & Match Scripting</h4>
              <p className="text-[10px] text-gray-400">
                This exact result will play out and settle automatically by full time.
              </p>
            </div>
          </div>
          <span className="text-xs font-black px-2 py-0.5 rounded-md bg-[#E41B23] text-white">
            {targetHomeScore} – {targetAwayScore}
          </span>
        </div>

        {/* Winner Selector */}
        <div className="space-y-1">
          <label className={labelCls}>Target Match Winner</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleWinnerChange("home")}
              className={cn(
                "py-2 px-3 rounded-xl border text-xs font-black transition-all flex items-center justify-center gap-1.5",
                targetOutcome === "home"
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/60 shadow-md"
                  : "bg-[#1e1e26] text-gray-400 border-[#2a2a35] hover:text-white"
              )}
            >
              <span>🏠</span> Home Win (1)
            </button>
            <button
              type="button"
              onClick={() => handleWinnerChange("draw")}
              className={cn(
                "py-2 px-3 rounded-xl border text-xs font-black transition-all flex items-center justify-center gap-1.5",
                targetOutcome === "draw"
                  ? "bg-blue-500/20 text-blue-400 border-blue-500/60 shadow-md"
                  : "bg-[#1e1e26] text-gray-400 border-[#2a2a35] hover:text-white"
              )}
            >
              <span>🤝</span> Draw (X)
            </button>
            <button
              type="button"
              onClick={() => handleWinnerChange("away")}
              className={cn(
                "py-2 px-3 rounded-xl border text-xs font-black transition-all flex items-center justify-center gap-1.5",
                targetOutcome === "away"
                  ? "bg-purple-500/20 text-purple-400 border-purple-500/60 shadow-md"
                  : "bg-[#1e1e26] text-gray-400 border-[#2a2a35] hover:text-white"
              )}
            >
              <span>✈️</span> Away Win (2)
            </button>
          </div>
        </div>

        {/* Target Final Score Controls */}
        <div className="space-y-1.5">
          <label className={labelCls}>Target Final Score (Goals)</label>
          <div className="flex items-center justify-center gap-4 py-2 bg-[#1e1e26] rounded-xl border border-[#2a2a35]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-300 truncate max-w-[100px]">
                {homeTeam || "Home"}
              </span>
              <button
                type="button"
                onClick={() => handleSetScore(Math.max(0, targetHomeScore - 1), targetAwayScore)}
                className="h-7 w-7 rounded-lg bg-[#121216] border border-[#2a2a35] text-white hover:border-[#F5C400]/40 font-black text-sm flex items-center justify-center"
              >
                -
              </button>
              <span className="text-xl font-black text-[#F5C400] w-6 text-center tabular-nums">
                {targetHomeScore}
              </span>
              <button
                type="button"
                onClick={() => handleSetScore(targetHomeScore + 1, targetAwayScore)}
                className="h-7 w-7 rounded-lg bg-[#121216] border border-[#2a2a35] text-white hover:border-[#F5C400]/40 font-black text-sm flex items-center justify-center"
              >
                +
              </button>
            </div>

            <span className="text-gray-500 font-black text-base">—</span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSetScore(targetHomeScore, Math.max(0, targetAwayScore - 1))}
                className="h-7 w-7 rounded-lg bg-[#121216] border border-[#2a2a35] text-white hover:border-[#F5C400]/40 font-black text-sm flex items-center justify-center"
              >
                -
              </button>
              <span className="text-xl font-black text-[#F5C400] w-6 text-center tabular-nums">
                {targetAwayScore}
              </span>
              <button
                type="button"
                onClick={() => handleSetScore(targetHomeScore, targetAwayScore + 1)}
                className="h-7 w-7 rounded-lg bg-[#121216] border border-[#2a2a35] text-white hover:border-[#F5C400]/40 font-black text-sm flex items-center justify-center"
              >
                +
              </button>
              <span className="text-xs font-bold text-gray-300 truncate max-w-[100px]">
                {awayTeam || "Away"}
              </span>
            </div>
          </div>

          {/* Quick Score Chips */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[10px] text-gray-500 font-semibold mr-1">Presets:</span>
            {COMMON_PRESETS[targetOutcome].map(({ h, a }) => (
              <button
                key={`${h}-${a}`}
                type="button"
                onClick={() => handleSetScore(h, a)}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors",
                  targetHomeScore === h && targetAwayScore === a
                    ? "bg-[#F5C400] text-black border-[#F5C400]"
                    : "bg-[#1e1e26] text-gray-400 border-[#2a2a35] hover:text-white"
                )}
              >
                {h} - {a}
              </button>
            ))}
          </div>
        </div>

        {/* Simulation Pace / Match Duration */}
        <div className="space-y-1">
          <label className={`${labelCls} flex items-center gap-1`}>
            <Timer className="h-3 w-3 text-[#F5C400]" /> Match Duration / Play Pace
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { mins: 90, label: "90m Real-Time" },
              { mins: 15, label: "15m Fast" },
              { mins: 5, label: "5m Rapid" },
              { mins: 2, label: "2m Quick Test" },
            ].map(({ mins, label }) => (
              <button
                key={mins}
                type="button"
                onClick={() => setDurationMinutes(mins)}
                className={cn(
                  "py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-colors text-center",
                  durationMinutes === mins
                    ? "bg-[#F5C400]/20 text-[#F5C400] border-[#F5C400]/50"
                    : "bg-[#1e1e26] text-gray-400 border-[#2a2a35] hover:text-white"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Automated Simulation Explainer */}
        <div className="text-[10px] text-gray-400 bg-[#1e1e26]/80 rounded-lg p-2.5 border border-[#2a2a35] space-y-1">
          <p className="flex items-center gap-1 text-[#F5C400] font-bold">
            <Sparkles className="h-3 w-3" /> Live In-Play Simulation Guarantee:
          </p>
          <p>
            When the match kicks off ({kickoffTime} GMT), it will switch to <strong className="text-emerald-400">LIVE</strong> automatically.
            Virtual clock will advance 1&apos; → 90&apos;, and goals will be scored along the way to reach exactly{" "}
            <strong className="text-white">{targetHomeScore} – {targetAwayScore}</strong> by the final whistle. All bets settle on this exact result.
          </p>
        </div>
      </div>

      <Button
        type="button"
        onClick={handleAdd}
        className="w-full bg-[#E41B23] hover:bg-[#c0141e] text-white text-xs font-black h-9.5 shadow-md"
      >
        <Plus className="h-4 w-4 mr-1.5" /> Save Match to Platform
      </Button>
    </div>
  );
}

function FinishMatchForm({ match, onFinish }: { match: AdminMatch; onFinish: (h: number, a: number) => void }) {
  const parsed = parseAdminMatchOutcome(match);
  const [home, setHome] = useState(match.homeScore?.toString() ?? parsed.targetHome.toString());
  const [away, setAway] = useState(match.awayScore?.toString() ?? parsed.targetAway.toString());

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
      <Input value={home} onChange={(e) => setHome(e.target.value)} placeholder="H" className="h-7 w-12 text-center text-xs bg-[#121216] border-[#2a2a35] text-white font-bold" />
      <span className="text-gray-500 text-xs font-bold">–</span>
      <Input value={away} onChange={(e) => setAway(e.target.value)} placeholder="A" className="h-7 w-12 text-center text-xs bg-[#121216] border-[#2a2a35] text-white font-bold" />
      <Button type="button" onClick={submit} className="h-7 px-2.5 text-[10px] font-black bg-emerald-600 hover:bg-emerald-700 text-white">
        Save final score
      </Button>
    </div>
  );
}

function EditTargetModal({
  match,
  onSave,
  onClose,
}: {
  match: AdminMatch;
  onSave: (patch: Partial<AdminMatch>) => void;
  onClose: () => void;
}) {
  const current = parseAdminMatchOutcome(match);
  const [outcome, setOutcome] = useState<AdminMatchOutcome>(current.outcome);
  const [home, setHome] = useState(current.targetHome);
  const [away, setAway] = useState(current.targetAway);
  const [duration, setDuration] = useState(current.durationMinutes);

  const save = () => {
    onSave({
      outcome,
      outcomeScore: `${home}-${away}:${duration}`,
      targetOutcome: outcome,
      targetHomeScore: home,
      targetAwayScore: away,
      durationMinutes: duration,
    });
    toast.success("Target outcome updated!");
    onClose();
  };

  return (
    <div className="p-3 bg-[#121216] rounded-xl border border-[#F5C400]/40 space-y-2.5 mt-2">
      <div className="flex items-center justify-between text-xs font-black text-white">
        <span className="flex items-center gap-1.5 text-[#F5C400]">
          <Target className="h-3.5 w-3.5" /> Adjust Target Outcome
        </span>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-white text-xs">
          ✕
        </button>
      </div>

      <div className="flex items-center gap-2">
        {(["home", "draw", "away"] as const).map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => {
              setOutcome(o);
              if (o === "home" && home <= away) { setHome(2); setAway(1); }
              else if (o === "draw" && home !== away) { setHome(1); setAway(1); }
              else if (o === "away" && home >= away) { setHome(0); setAway(2); }
            }}
            className={cn(
              "flex-1 py-1 px-2 rounded-lg text-[10px] font-black border uppercase transition-colors",
              outcome === o
                ? "bg-[#E41B23] text-white border-[#E41B23]"
                : "bg-[#1e1e26] text-gray-400 border-[#2a2a35] hover:text-white"
            )}
          >
            {o}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-center gap-3 py-1 bg-[#1e1e26] rounded-lg">
        <span className="text-xs font-bold text-gray-300">{match.homeTeam}</span>
        <Input
          type="number"
          min={0}
          max={9}
          value={home}
          onChange={(e) => {
            const val = Math.max(0, parseInt(e.target.value) || 0);
            setHome(val);
            if (val > away) setOutcome("home");
            else if (val < away) setOutcome("away");
            else setOutcome("draw");
          }}
          className="w-12 h-7 text-center text-xs bg-[#121216] border-[#2a2a35] text-[#F5C400] font-black"
        />
        <span className="text-gray-500 font-bold">–</span>
        <Input
          type="number"
          min={0}
          max={9}
          value={away}
          onChange={(e) => {
            const val = Math.max(0, parseInt(e.target.value) || 0);
            setAway(val);
            if (home > val) setOutcome("home");
            else if (home < val) setOutcome("away");
            else setOutcome("draw");
          }}
          className="w-12 h-7 text-center text-xs bg-[#121216] border-[#2a2a35] text-[#F5C400] font-black"
        />
        <span className="text-xs font-bold text-gray-300">{match.awayTeam}</span>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-400">Pace:</span>
          {[90, 10, 5, 2].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setDuration(m)}
              className={cn(
                "px-1.5 py-0.5 rounded text-[9px] font-bold border",
                duration === m
                  ? "bg-[#F5C400]/20 text-[#F5C400] border-[#F5C400]/50"
                  : "bg-[#1e1e26] text-gray-500 border-[#2a2a35]"
              )}
            >
              {m}m
            </button>
          ))}
        </div>
        <Button
          type="button"
          onClick={save}
          className="h-7 px-3 text-[10px] font-black bg-[#E41B23] hover:bg-[#c0141e] text-white"
        >
          Update Target
        </Button>
      </div>
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
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);

  const sorted = [...matches].sort((a, b) =>
    new Date(`${a.kickoffDate}T${a.kickoffTime}:00.000Z`).getTime() -
    new Date(`${b.kickoffDate}T${b.kickoffTime}:00.000Z`).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500 text-xs bg-[#1e1e26] rounded-2xl border border-[#2a2a35]">
        <Trophy className="h-8 w-8 mx-auto mb-2 opacity-20 text-[#F5C400]" />
        No matches scheduled yet. Click &quot;Add Match&quot; above to schedule games.
      </div>
    );
  }

  const now = Date.now();

  return (
    <div className="space-y-2.5">
      {sorted.map((m) => {
        const league = leagueMap[m.leagueId];
        const state = computeAdminMatchLiveState(m, now);
        const parsed = parseAdminMatchOutcome(m);
        const hasScore = typeof m.homeScore === "number" && typeof m.awayScore === "number";

        const winnerLabel =
          parsed.outcome === "home"
            ? "Home Win"
            : parsed.outcome === "away"
              ? "Away Win"
              : "Draw";

        return (
          <div
            key={m.id}
            className="bg-[#1e1e26] rounded-xl border border-[#2a2a35] p-3.5 flex items-start gap-3 hover:border-[#F5C400]/30 transition-colors shadow-sm"
          >
            <div
              className="w-1.5 self-stretch rounded-full shrink-0"
              style={{ backgroundColor: league?.color ?? "#E41B23" }}
            />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 text-[10px] text-gray-400 font-semibold flex-wrap">
                {league?.logoUrl ? (
                  <img src={league.logoUrl} className="h-3.5 w-3.5 rounded-full object-cover" alt="" />
                ) : (
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: league?.color ?? "#E41B23" }} />
                )}
                <span className="font-bold text-gray-300">{league?.name ?? "Custom League"}</span>
                <span>•</span>
                <span className="text-gray-300">
                  {m.kickoffDate} at {m.kickoffTime} GMT
                </span>
                <span>•</span>
                {/* Target Outcome Badge */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F5C400]/15 border border-[#F5C400]/30 text-[#F5C400] font-black text-[10px]">
                  <Target className="h-3 w-3" /> Target: {parsed.targetHome} – {parsed.targetAway} ({winnerLabel})
                  {parsed.durationMinutes !== 90 && (
                    <span className="text-[9px] opacity-75">[{parsed.durationMinutes}m]</span>
                  )}
                </span>
              </div>

              {/* Match Teams & Live/FT Score */}
              <div className="flex items-center gap-2 text-sm font-black text-white">
                {m.homeLogoUrl ? (
                  <img src={m.homeLogoUrl} className="h-5 w-5 rounded-full object-cover bg-white/10" alt="" />
                ) : null}
                <span className="truncate">{m.homeTeam}</span>
                <span className={cn(
                  "px-2 py-0.5 rounded-md text-xs font-black",
                  state.status === "LIVE"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : state.status === "FINISHED"
                      ? "bg-white/10 text-white"
                      : "text-gray-500"
                )}>
                  {state.status === "LIVE" || state.status === "FINISHED" || hasScore
                    ? `${state.homeScore ?? m.homeScore ?? 0} – ${state.awayScore ?? m.awayScore ?? 0}`
                    : "vs"}
                </span>
                {m.awayLogoUrl ? (
                  <img src={m.awayLogoUrl} className="h-5 w-5 rounded-full object-cover bg-white/10" alt="" />
                ) : null}
                <span className="truncate">{m.awayTeam}</span>
              </div>

              {/* Status and Progress */}
              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1",
                    state.status === "FINISHED" || m.status === "finished"
                      ? "bg-gray-700/50 text-gray-300 border border-gray-600/30"
                      : m.status === "cancelled"
                        ? "bg-red-500/15 text-red-400 border border-red-500/30"
                        : state.status === "LIVE" || m.status === "live"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse font-black"
                          : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                  )}
                >
                  {(state.status === "FINISHED" || m.status === "finished") && (
                    <><CheckCircle2 className="h-3 w-3 text-emerald-400" /> Finished FT</>
                  )}
                  {m.status === "cancelled" && (<><XCircle className="h-3 w-3" /> Cancelled — bets void</>)}
                  {(state.status === "LIVE" || m.status === "live") && (
                    <><Play className="h-3 w-3" /> LIVE {state.minute}&apos; (Playing towards {parsed.targetHome}–{parsed.targetAway})</>
                  )}
                  {state.status === "SCHEDULED" && m.status === "scheduled" && (
                    <><Clock className="h-3 w-3" /> Scheduled (Betting Open)</>
                  )}
                </span>

                {/* Progress bar for live matches */}
                {state.status === "LIVE" && state.minute && (
                  <div className="flex items-center gap-1.5 text-[9px] text-gray-400">
                    <div className="w-20 bg-[#121216] rounded-full h-1.5 overflow-hidden border border-[#2a2a35]">
                      <div
                        className="bg-emerald-500 h-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (state.minute / 90) * 100)}%` }}
                      />
                    </div>
                    <span>{state.minute}&apos;/90&apos;</span>
                  </div>
                )}
              </div>

              {/* Editing Target inline */}
              {editingTargetId === m.id && (
                <EditTargetModal
                  match={m}
                  onSave={(patch) => {
                    onUpdate({ id: m.id, ...patch });
                    setEditingTargetId(null);
                  }}
                  onClose={() => setEditingTargetId(null)}
                />
              )}

              {/* Finish match manual score form */}
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

            {/* Quick Actions for Match */}
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

              {/* Kick Off Now Button (Starts match live immediately) */}
              {m.status === "scheduled" && state.status === "SCHEDULED" && (
                <button
                  type="button"
                  title="Start live playback now"
                  onClick={() => {
                    const today = todayStr();
                    const nowTime = currentTimeStr(0);
                    onUpdate({
                      id: m.id,
                      status: "live",
                      kickoffDate: today,
                      kickoffTime: nowTime,
                    });
                    toast.success(`Match kicked off! Now playing live toward target ${parsed.targetHome}-${parsed.targetAway}.`);
                  }}
                  className="px-2 py-1 rounded-md text-[10px] font-black bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-1 shadow-sm"
                >
                  <Play className="h-3 w-3" /> Kick off now
                </button>
              )}

              {/* Fast Forward / Finish with Target Outcome */}
              {(state.status === "LIVE" || m.status === "live" || m.status === "scheduled") && (
                <button
                  type="button"
                  title="Instantly complete match with target outcome and settle bets"
                  onClick={() => {
                    if (confirm(`Finish "${m.homeTeam} vs ${m.awayTeam}" with target score ${parsed.targetHome} – ${parsed.targetAway}? Bets will settle on this result.`)) {
                      onUpdate({
                        id: m.id,
                        status: "finished",
                        homeScore: parsed.targetHome,
                        awayScore: parsed.targetAway,
                      });
                    }
                  }}
                  className="px-2 py-1 rounded-md text-[10px] font-black bg-[#F5C400]/15 border border-[#F5C400]/40 text-[#F5C400] hover:bg-[#F5C400] hover:text-black transition-all flex items-center gap-1 shadow-sm"
                >
                  <FastForward className="h-3 w-3" /> Finish to Target ({parsed.targetHome}-{parsed.targetAway})
                </button>
              )}

              {/* Change Target button (only if not finished) */}
              {m.status !== "finished" && (
                <button
                  type="button"
                  onClick={() => setEditingTargetId(editingTargetId === m.id ? null : m.id)}
                  className="px-2 py-1 rounded-md text-[10px] font-bold bg-[#121216] border border-[#2a2a35] text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  <Target className="h-3 w-3" /> Target
                </button>
              )}

              {/* Finish manually or cancel */}
              {(m.status === "scheduled" || m.status === "live") && (
                <>
                  <button
                    type="button"
                    onClick={() => setFinishingId(finishingId === m.id ? null : m.id)}
                    className="px-2 py-1 rounded-md text-[10px] font-bold bg-[#121216] border border-[#2a2a35] text-gray-400 hover:text-white transition-colors"
                  >
                    Custom FT…
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

  const [view, setView] = useState<"matches" | "list" | "leagues">("matches");
  const [settling, setSettling] = useState(false);

  // Combined list of custom admin leagues + standard sports leagues
  const availableLeagues: SelectableLeague[] = useMemo(() => {
    const custom: SelectableLeague[] = adminLeagues.map((l) => ({
      id: l.id,
      name: l.name,
      color: l.color,
      logoUrl: l.logoUrl,
      defaultOutcome: l.defaultOutcome,
      defaultHomeScore: l.defaultHomeScore,
      defaultAwayScore: l.defaultAwayScore,
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
          <span className="font-bold text-white">How target outcomes work:</span> When adding a match, set your target
          winner, final score, and match pace. At kickoff time, the match automatically kicks off live. Goals will occur
          during in-play, and the game will end at exactly the specified target outcome. Bets settle automatically upon full time.
        </div>
      </div>
    </div>
  );
}
