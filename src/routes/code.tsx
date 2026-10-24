import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Ticket } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionHeading } from "@/components/common/States";
import { teamById } from "@/data/football";
import { selectionMatch, useBetrix, type HistoryEntry } from "@/store/betrix";
import { fetchSlipByCode } from "@/services/backendSync";

export const Route = createFileRoute("/code")({
  head: () => ({
    meta: [
      { title: "Load a Prediction Code — BETRIX" },
      { name: "description", content: "Paste a BETRIX prediction code to load someone's selections straight into your slip." },
      { property: "og:title", content: "Load a Prediction Code — BETRIX" },
      { property: "og:description", content: "Share and load football prediction codes on BETRIX." },
    ],
  }),
  component: CodePage,
});

function CodePage() {
  const { history, loadSlip } = useBetrix();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [remote, setRemote] = useState<HistoryEntry | null>(null);
  const rawClean = code.trim().toUpperCase();
  const clean = !rawClean.startsWith("BTX-") && /^[A-Z0-9]{4,10}$/.test(rawClean) ? `BTX-${rawClean}` : rawClean;
  const local = history.find((h) => h.code.toUpperCase() === clean);
  const found = local || (remote?.code === clean ? remote : undefined);

  // Codes shared by other players are looked up on the server.
  useEffect(() => {
    if (local || !/^BTX-[A-Z0-9]{4,12}$/.test(clean)) return;
    let cancelled = false;
    fetchSlipByCode(clean).then((r) => {
      if (!cancelled) setRemote(r);
    });
    return () => {
      cancelled = true;
    };
  }, [clean, local]);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <SectionHeading title="Load prediction code" subtitle="Paste a BETRIX code to copy those selections into your slip." />

      <div className="surface-card space-y-3 rounded-2xl p-4">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="BTX-XXXXX"
          aria-label="Prediction code"
          className="tabular h-12 text-center text-lg font-bold tracking-widest"
        />
        <Button
          className="w-full gap-2"
          disabled={!found}
          onClick={() => {
            if (!found) return;
            loadSlip(found.selections);
            toast.success(`Loaded ${found.selections.length} selections from ${found.code}`);
            void navigate({ to: "/predictions" });
          }}
        >
          <Ticket className="h-4 w-4" />
          {found ? `Load ${found.selections.length} selections` : "Enter a valid code"}
        </Button>
        {code.trim().length > 3 && !found ? (
          <p className="text-center text-xs text-destructive">No prediction found for that code.</p>
        ) : null}
      </div>

      {found ? (
        <div className="surface-card rounded-2xl p-4">
          <p className="text-sm font-semibold">Preview</p>
          <ul className="mt-2 space-y-1.5">
            {found.selections.map((s, i) => {
              const m = selectionMatch(s);
              const matchName = s.matchTitle || (m ? `${teamById(m.homeId).short} vs ${teamById(m.awayId).short}` : "Match");
              return (
                <li key={i} className="flex items-center justify-between gap-3 border-b border-border/50 pb-1.5 text-xs last:border-0">
                  <span className="min-w-0 truncate">
                    {matchName} · {s.optionLabel}
                  </span>
                  <span className="tabular shrink-0 font-semibold">{s.multiplier.toFixed(2)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="surface-card rounded-2xl p-4">
        <p className="text-sm font-semibold">Your recent codes</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {history.map((h) => (
            <button
              key={h.code}
              type="button"
              onClick={() => setCode(h.code)}
              className="tabular rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold transition-colors hover:border-primary"
            >
              {h.code}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
