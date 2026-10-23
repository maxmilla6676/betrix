import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight, PlusCircle, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SectionHeading } from "@/components/common/States";
import { formatGHS, useBetrix } from "@/store/betrix";
import { PaymentGatewayModal, PENDING_DEPOSIT_KEY } from "@/components/payment/PaymentGatewayModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GHANA_TZ } from "@/lib/ghana-time";

export const Route = createFileRoute("/points")({
  head: () => ({
    meta: [
      { title: "Real Cedis Wallet — BETRIX Sportsbook" },
      { name: "description", content: "Manage your BETRIX Cedis wallet, instant Mobile Money gateway deposits and betting activity." },
      { property: "og:title", content: "Real Cedis Wallet — BETRIX" },
      { property: "og:description", content: "Deposit and manage your GHS balance with Ghana Mobile Money & Cards." },
    ],
  }),
  component: WalletPage,
});

const TX_LABELS: Record<string, string> = {
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
  STAKE: "Stake",
  PAYOUT: "Winnings",
  REFUND: "Refund",
};

/** After SeevPlus redirects back, ask the server to confirm the payment (it polls SeevPlus). */
function useDepositReturn() {
  const { isLoggedIn, verifyDeposit } = useBetrix();
  const [state, setState] = useState<"idle" | "checking" | "credited" | "failed" | "pending">("idle");

  useEffect(() => {
    if (typeof window === "undefined" || !isLoggedIn) return;
    const params = new URLSearchParams(window.location.search);
    let orderId = params.get("gateway") === "seevplus" ? params.get("order") : null;
    if (!orderId) {
      try {
        orderId = JSON.parse(sessionStorage.getItem(PENDING_DEPOSIT_KEY) || "null")?.orderId ?? null;
      } catch {
        orderId = null;
      }
    }
    if (!orderId) return;
    window.history.replaceState({}, document.title, window.location.pathname);

    let cancelled = false;
    let attempts = 0;
    setState("checking");
    const check = async () => {
      if (cancelled) return;
      attempts++;
      try {
        const res = await verifyDeposit({ orderId: orderId! });
        if (res.status === "CREDITED") {
          sessionStorage.removeItem(PENDING_DEPOSIT_KEY);
          setState("credited");
          toast.success(`Payment confirmed — GHS ${res.amount.toFixed(2)} added to your wallet.`);
          return;
        }
        if (res.status === "FAILED") {
          sessionStorage.removeItem(PENDING_DEPOSIT_KEY);
          setState("failed");
          toast.error("The payment was not completed. No money was taken.");
          return;
        }
      } catch {
        /* transient: keep polling */
      }
      if (attempts < 20) {
        setTimeout(check, 5000);
      } else {
        setState("pending");
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, verifyDeposit]);

  return state;
}

function WalletPage() {
  const { balance, history, transactions } = useBetrix();
  const [depositOpen, setDepositOpen] = useState(false);
  const depositState = useDepositReturn();

  const staked = history.reduce((a, h) => a + h.stake, 0);
  const won = history.reduce((a, h) => a + h.payout, 0);
  const pending = history.filter((h) => h.status === "PENDING").length;

  const combinedLedger = transactions.map((t) => ({
    id: t.id,
    label: `${TX_LABELS[t.type] || t.type} · ${t.method || t.reference}`,
    at: t.createdAt,
    delta: t.type === "DEPOSIT" || t.type === "PAYOUT" || t.type === "REFUND" ? t.amount : -t.amount,
    ref: t.reference,
  }));

  return (
    <div className="space-y-4 p-3 md:p-6">
      <PaymentGatewayModal open={depositOpen} onOpenChange={setDepositOpen} defaultAmount={250} />

      {depositState === "checking" && (
        <div role="status" className="flex items-center gap-2 rounded-2xl border border-[#F5C400]/30 bg-[#F5C400]/10 p-3 text-xs font-bold text-[#F5C400]">
          <Loader2 className="h-4 w-4 animate-spin" /> Confirming your payment with SeevPlus…
        </div>
      )}
      {depositState === "pending" && (
        <div role="status" className="rounded-2xl border border-[#2A264F] bg-[#1C1936] p-3 text-xs text-gray-300">
          Your payment is still processing. Your balance will update automatically once SeevPlus confirms it.
        </div>
      )}

      {/* Main Balance Header */}
      <section className="bg-gradient-to-br from-[#1C1936] to-[#121026] border border-[#2A264F] rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-widest text-[#F5C400]">Real Cedis Wallet Balance</p>
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> Live GHS Gateway
          </span>
        </div>

        <p className="tabular mt-3 flex items-baseline gap-2 text-4xl font-black text-white font-mono">
          <span className="text-2xl text-[#F5C400]">GHS</span>
          {balance.toFixed(2)}
        </p>

        <p className="mt-2 text-xs text-gray-300 font-medium">
          Instant deposits & fast cashouts via MTN Mobile Money, Telecel Cash, AT Money, and Visa/Mastercard.
        </p>

        <div className="mt-5 flex gap-3">
          <Button
            onClick={() => setDepositOpen(true)}
            className="bg-[#F5C400] hover:bg-[#e0b300] text-black font-black text-sm h-11 px-5 rounded-2xl shadow-lg flex items-center gap-2 uppercase tracking-wider"
          >
            <PlusCircle className="h-4 w-4 fill-black text-black" />
            <span>Deposit Cedis (GHS)</span>
          </Button>
        </div>
      </section>

      {/* Wallet Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Staked", value: formatGHS(staked) },
          { label: "Total Won", value: formatGHS(won) },
          { label: "Pending Slips", value: String(pending) },
        ].map((s) => (
          <div key={s.label} className="bg-[#1C1936] border border-[#2A264F] rounded-2xl p-4">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
            <p className="tabular mt-1 text-lg font-mono font-black text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Activity Ledger */}
      <SectionHeading title="Wallet Activity" subtitle="Real-time deposit, withdrawal & staking transactions" />
      <div className="bg-[#1C1936] border border-[#2A264F] rounded-2xl p-2 divide-y divide-[#262247]">
        {combinedLedger.map((l) => (
          <div key={l.id} className="flex items-center justify-between gap-3 px-3 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-white">{l.label}</p>
              <p className="tabular text-xs text-gray-400 font-medium">
                {new Date(l.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: GHANA_TZ })}
              </p>
            </div>
            <span
              className={cn(
                "tabular flex shrink-0 items-center gap-1 text-sm font-mono font-black",
                l.delta > 0 ? "text-emerald-400" : "text-gray-300",
              )}
            >
              {l.delta > 0 ? <ArrowUpRight className="h-4 w-4 text-emerald-400" /> : <ArrowDownRight className="h-4 w-4 text-rose-400" />}
              {formatGHS(Math.abs(l.delta))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
