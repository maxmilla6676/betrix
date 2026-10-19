import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PrimeMatchCard } from "@/components/match/PrimeMatchCard";
import { PrimeDateHeader, generateDateOptions, type DateOption } from "@/components/match/PrimeDateHeader";
import { EmptyState } from "@/components/common/States";
import { cn } from "@/lib/utils";
import { leagues, type Match } from "@/data/football";
import { useBetrix } from "@/store/betrix";
import { fetchLiveSportsFixtures } from "@/services/sportsApi";
import { Globe, RotateCw } from "lucide-react";

export const Route = createFileRoute("/matches")({
  head: () => ({
    meta: [
      { title: "Sports Fixtures & Live Odds — BETRIX" },
      { name: "description", content: "Up to date live match fixtures, dynamic odds, and daily sports schedule on BETRIX." },
      { property: "og:title", content: "Sports Fixtures — BETRIX" },
      { property: "og:description", content: "Today and upcoming sports fixtures with real-time prediction markets." },
    ],
  }),
  component: MatchesPage,
});

export function MatchesPage() {
  const dateOptions = generateDateOptions();
  const [selectedDate, setSelectedDate] = useState<DateOption>(dateOptions[0]!);
  const [selectedLeague, setSelectedLeague] = useState<string>("all");

  const { allMatches, adminLeagues, isApiLoading, fetchApiMatches, apiMatches } = useBetrix();
  const [dateMatches, setDateMatches] = useState<Match[]>([]);
  const [loadingDate, setLoadingDate] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    async function loadDateFixtures() {
      setLoadingDate(true);
      try {
        const res = await fetchLiveSportsFixtures(undefined, selectedDate.espnParam);
        if (!cancelled) {
          setDateMatches(res.matches);
        }
      } catch {
        // fallback
      } finally {
        if (!cancelled) setLoadingDate(false);
      }
    }
    loadDateFixtures();
    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  // Combine store matches with date-specific matches including admin matches for that date
  // Sort: LIVE first (by minute desc), then SCHEDULED ascending by kickoff time
  const currentList = useMemo(() => {
    const adminForDate = allMatches.filter((m) => {
      if (!m.id.startsWith("adm-") && !m.id.startsWith("admin-")) return false;
      const mDate = m.kickoff.slice(0, 10);
      return mDate === selectedDate.iso || m.status === "LIVE";
    });

    let combined: Match[];
    if (dateMatches.length > 0) {
      const existingIds = new Set(dateMatches.map((m) => m.id));
      const filteredAdmin = adminForDate.filter((m) => !existingIds.has(m.id));
      combined = [...filteredAdmin, ...dateMatches];
    } else {
      combined = [...allMatches];
    }

    return combined.sort((a, b) => {
      if (a.status === "LIVE" && b.status !== "LIVE") return -1;
      if (b.status === "LIVE" && a.status !== "LIVE") return 1;
      if (a.status === "LIVE" && b.status === "LIVE") return (b.minute ?? 0) - (a.minute ?? 0);
      if (a.status === "FINISHED" && b.status !== "FINISHED") return 1;
      if (b.status === "FINISHED" && a.status !== "FINISHED") return -1;
      return a.kickoff.localeCompare(b.kickoff);
    });
  }, [dateMatches, allMatches, selectedDate.iso]);

  const allAvailableLeagues = useMemo(() => {
    const custom = (adminLeagues || []).map((al) => ({
      id: al.id,
      name: al.name,
      color: al.color,
      logoUrl: al.logoUrl,
    }));
    return [{ id: "all", name: "All Leagues", color: "#eab308" }, ...leagues, ...custom];
  }, [adminLeagues]);

  const filtered = currentList.filter((m) => {
    if (selectedLeague !== "all" && m.leagueId !== selectedLeague) return false;
    return true;
  });

  const liveCount = currentList.filter((m) => m.status === "LIVE").length;

  return (
    <div className="flex flex-col min-h-screen bg-[#0f0f10] text-[#f4f4f5]">
      {/* Primestakers Header Bar */}
      <PrimeDateHeader
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        matchCount={filtered.length}
        liveCount={liveCount}
      />

      {/* Main Container */}
      <div className="p-3 sm:p-4 space-y-4 max-w-5xl mx-auto w-full">
        {/* Subheader controls & League Filter */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#18181b] p-2.5 rounded-xl border border-[#27272a]">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            {allAvailableLeagues.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setSelectedLeague(l.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-extrabold transition-all",
                  selectedLeague === l.id
                    ? "border-[#eab308] bg-[#eab308] text-black font-black"
                    : "border-[#27272a] bg-[#27272a] text-[#a1a1aa] hover:border-[#3f3f46] hover:text-white",
                )}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
                {l.name}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchApiMatches()}
            disabled={isApiLoading || loadingDate}
            className="inline-flex items-center gap-1.5 text-xs font-extrabold bg-[#27272a] hover:bg-[#3f3f46] text-[#eab308] px-3 py-1.5 rounded-lg border border-[#3f3f46] transition-all disabled:opacity-50 ml-auto shrink-0"
          >
            <RotateCw className={cn("w-3.5 h-3.5", (isApiLoading || loadingDate) && "animate-spin text-[#eab308]")} />
            {isApiLoading || loadingDate ? "Syncing..." : "Sync Live API"}
          </button>
        </div>

        {/* Fixtures List */}
        {loadingDate ? (
          <div className="text-center py-16 bg-[#18181b] rounded-xl border border-[#27272a] text-[#a1a1aa]">
            <RotateCw className="w-6 h-6 animate-spin text-[#eab308] mx-auto mb-2" />
            <p className="text-xs font-bold uppercase tracking-wider">Loading Live Fixtures for {selectedDate.dayName}...</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={`No fixtures found for ${selectedDate.dayName}`}
            description="Try selecting another date or league filter."
          />
        ) : (
          <div className="space-y-2.5">
            {filtered.map((m) => (
              <PrimeMatchCard key={m.id} match={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
