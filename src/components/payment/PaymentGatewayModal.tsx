import { useState } from "react";
import { ShieldCheck, Loader2, Lock, Zap, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBetrix, formatGHS } from "@/store/betrix";
import { cn } from "@/lib/utils";

export interface PaymentGatewayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAmount?: number;
}

const PRESET_AMOUNTS = [30, 50, 100, 200, 300, 500, 1000];
const MIN_DEPOSIT = 1;
const MAX_DEPOSIT = 10000;

/** Session key the wallet page reads after SeevPlus redirects back. */
export const PENDING_DEPOSIT_KEY = "betrix.pendingDeposit";

export function PaymentGatewayModal({
  open,
  onOpenChange,
  defaultAmount = 300,
}: PaymentGatewayModalProps) {
  const { profile, isLoggedIn, startDeposit } = useBetrix();
  const [amount, setAmount] = useState<number>(defaultAmount);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      toast.error("Please log in to deposit.");
      return;
    }
    if (!amount || amount < MIN_DEPOSIT || amount > MAX_DEPOSIT) {
      toast.error(
        `Enter an amount between GHS ${MIN_DEPOSIT} and GHS ${MAX_DEPOSIT.toLocaleString()}.`,
      );
      return;
    }
    setSubmitting(true);
    try {
      const res = await startDeposit(amount);
      try {
        sessionStorage.setItem(
          PENDING_DEPOSIT_KEY,
          JSON.stringify({ orderId: res.orderId, amount }),
        );
      } catch {
        /* the redirect URL also carries the order id */
      }
      // SeevPlus hosts the payment page (MoMo prompt / card entry); we never see card details.
      window.location.href = res.checkoutUrl;
    } catch (err) {
      setSubmitting(false);
      toast.error(
        err instanceof Error ? err.message : "Could not start the payment. Please try again.",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="bg-[#14141a] text-white border-[#242430] max-w-md rounded-3xl p-0 overflow-hidden shadow-2xl">
        <div className="bg-[#1c1c24] border-b border-[#2a2a38] px-5 py-4 flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-[#F5C400]/10 border border-[#F5C400]/30 grid place-items-center text-[#F5C400]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base tracking-tight text-white">Deposit</h3>
            <p className="text-[11px] text-gray-400 font-medium">Secure checkout by SeevPlus</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-gray-300 uppercase tracking-wider flex items-center justify-between">
              <span>Amount (GHS)</span>
              <span className="text-xs font-mono font-bold text-[#F5C400]">
                {formatGHS(amount || 0)}
              </span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_AMOUNTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmount(p)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg border text-xs font-bold transition-all",
                    amount === p
                      ? "bg-[#F5C400] text-black border-[#F5C400] font-black"
                      : "bg-[#1c1c24] border-[#2a2a38] text-gray-300 hover:bg-[#252532]",
                  )}
                >
                  GHS {p}
                </button>
              ))}
            </div>
            <div className="relative mt-2">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-[#F5C400] font-mono">
                GHS
              </span>
              <Input
                type="number"
                min={MIN_DEPOSIT}
                max={MAX_DEPOSIT}
                step={1}
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="Enter amount"
                aria-label="Deposit amount in GHS"
                className="bg-[#1c1c24] border-[#2a2a38] text-white font-mono text-lg font-extrabold pl-14 h-12 rounded-xl focus:border-[#F5C400] focus:ring-0"
              />
            </div>
          </div>

          <div className="rounded-xl border border-[#2a2a38] bg-[#1c1c24] p-3 text-xs text-gray-300 space-y-1.5">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-gray-400" />
              <span>
                Account:{" "}
                <span className="font-mono font-bold text-white">{profile.phone || "—"}</span>
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              You'll be taken to SeevPlus to pay with MTN MoMo, Telecel Cash, AT Money or card. Your
              balance updates as soon as the payment is confirmed.
            </p>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#F5C400] hover:bg-[#e0b300] text-black font-black text-sm h-12 rounded-xl uppercase tracking-wider shadow-lg flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Opening secure checkout…
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 fill-black" /> Pay {formatGHS(amount || 0)}
              </>
            )}
          </Button>
          <p className="flex items-center justify-center gap-1 text-[10px] text-gray-500">
            <Lock className="h-3 w-3" /> Card details are entered on SeevPlus, never on BETRIX.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
