import { createFileRoute } from "@tanstack/react-router";
import { SlipContent } from "@/components/slip/PredictionSlip";
import { SectionHeading } from "@/components/common/States";

export const Route = createFileRoute("/predictions")({
  head: () => ({
    meta: [
      { title: "My Bet Slip — BETRIX" },
      { name: "description", content: "Review your BETRIX bet slip, adjust your GHS stake and generate a shareable prediction code." },
      { property: "og:title", content: "My Bet Slip — BETRIX" },
      { property: "og:description", content: "Build football predictions with GHS Cedis balance and share your prediction code." },
    ],
  }),
  component: PredictionsPage,
});

function PredictionsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-3 md:p-6">
      <SectionHeading title="My Bet Slip" subtitle="Place predictions with your GHS Cedis balance." />
      <div className="bg-[#1C1936] border border-[#2A264F] rounded-3xl p-4">
        <SlipContent />
      </div>
    </div>
  );
}
