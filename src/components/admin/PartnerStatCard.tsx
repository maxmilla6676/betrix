import { useState } from "react";
import { Check, ChevronDown, Copy, Pencil, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { GHANA_TZ } from "@/lib/ghana-time";
import { partnerEarnings } from "@/lib/partners";
import type { PartnerPayoutRecord, PartnerRecord } from "@/data/admin";

const ghs = (n: number) =>
  `GH₵${n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Props {
  partner: PartnerRecord;
  payouts: PartnerPayoutRecord[];
  onSaveRate: (partnerId: string, rate: number) => Promise<void>;
  onMarkPaid: (partnerId: string) => Promise<number | null>;
  onDelete: (partnerId: string) => Promise<boolean>;
}

/** Admin card: what a partner's link brought in, what they've earned, and payouts. */
export function PartnerStatCard({ partner, payouts, onSaveRate, onMarkPaid, onDelete }: Props) {
  const { totalDeposits, rate, earned, paidOut, unpaid } = partnerEarnings(partner);
  const [editing, setEditing] = useState(false);
  const [rateInput, setRateInput] = useState(String(rate));
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Live preview while editing: what this partner would have earned at the new rate.
  const previewRate = Number(rateInput);
  const preview =
    editing && Number.isFinite(previewRate)
      ? partnerEarnings({ ...partner, commissionRate: previewRate })
      : null;

  const saveRate = async () => {
    if (!Number.isFinite(previewRate) || previewRate < 0 || previewRate > 100) {
      toast.error("Enter a percentage between 0 and 100.");
      return;
    }
    setSaving(true);
    await onSaveRate(partner.id, previewRate);
    setSaving(false);
    setEditing(false);
  };

  const markPaid = async () => {
    if (
      !confirm(
        `Confirm you have paid ${partner.name} ${ghs(unpaid)}? This clears their unpaid balance.`,
      )
    )
      return;
    setPaying(true);
    const paid = await onMarkPaid(partner.id);
    setPaying(false);
    if (paid) toast.success(`Recorded ${ghs(paid)} payout to ${partner.name}.`);
  };

  const remove = async () => {
    const warning =
      unpaid > 0
        ? `

They are still owed ${ghs(unpaid)}. Deleting forfeits it — mark them as paid first if you owe them.`
        : "";
    if (
      !confirm(
        `Delete partner ${partner.name} (${partner.code})?

Their referral link stops working and their deposit tracking and payout history are removed. This can't be undone.${warning}`,
      )
    )
      return;
    setDeleting(true);
    const ok = await onDelete(partner.id);
    setDeleting(false);
    if (ok) toast.success(`Partner ${partner.name} deleted.`);
  };

  const copyLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    void navigator.clipboard.writeText(`${origin}/auth?mode=signup&ref=${partner.code}`);
    setCopied(true);
    toast.success(`Referral link for ${partner.code} copied.`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-[#2a2a35] bg-[#1a1a21] p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-black text-white">{partner.name}</h4>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
            <span className="rounded border border-[#2a2a35] bg-[#121216] px-1.5 py-0.5 font-mono font-bold text-[#F5C400]">
              {partner.code}
            </span>
            <span>{partner.signups} sign-ups</span>
            <span>•</span>
            <span>{partner.activeUsers} depositing</span>
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={copyLink}
            className="rounded-lg border border-[#2a2a35] p-1.5 text-gray-400 hover:text-white"
            aria-label={`Copy referral link for ${partner.name}`}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={deleting}
            className="rounded-lg border border-[#2a2a35] p-1.5 text-[#E41B23]/70 hover:bg-[#E41B23]/10 hover:text-[#E41B23] disabled:opacity-40"
            aria-label={`Delete partner ${partner.name}`}
            title="Delete partner"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Figures */}
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 rounded-xl bg-[#121216] p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
            Total deposited via link
          </p>
          <p className="mt-1 font-mono text-xl font-black text-white">{ghs(totalDeposits)}</p>
        </div>

        <div className="rounded-xl bg-[#121216] p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Commission</p>
          {editing ? (
            <div className="mt-1 flex items-center gap-1">
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                aria-label={`Commission percentage for ${partner.name}`}
                className="h-7 w-16 border-[#2a2a35] bg-[#1e1e26] px-2 text-xs text-white"
              />
              <span className="text-xs font-bold text-gray-300">%</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setRateInput(String(rate));
                setEditing(true);
              }}
              className="mt-1 flex items-center gap-1.5 font-mono text-lg font-black text-[#F5C400] hover:underline"
              aria-label={`Change commission percentage for ${partner.name}`}
            >
              {rate}%
              <Pencil className="h-3 w-3 text-gray-500" />
            </button>
          )}
        </div>

        <div className="rounded-xl bg-[#121216] p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Earned</p>
          <p className="mt-1 font-mono text-lg font-black text-white">
            {ghs(preview ? preview.earned : earned)}
          </p>
          <p className="text-[10px] text-gray-500">
            {preview ? `at ${previewRate}%` : `${rate}% of ${ghs(totalDeposits)}`}
          </p>
        </div>

        <div className="rounded-xl bg-[#121216] p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Paid out</p>
          <p className="mt-1 font-mono text-base font-black text-gray-300">{ghs(paidOut)}</p>
        </div>

        <div
          className={cn(
            "rounded-xl p-3",
            unpaid > 0 ? "border border-emerald-500/30 bg-emerald-500/10" : "bg-[#121216]",
          )}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Unpaid</p>
          <p
            className={cn(
              "mt-1 font-mono text-base font-black",
              unpaid > 0 ? "text-emerald-400" : "text-gray-300",
            )}
          >
            {ghs(preview ? preview.unpaid : unpaid)}
          </p>
        </div>
      </div>

      {editing && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-[#F5C400]/30 bg-[#F5C400]/5 p-2.5 text-[11px] text-gray-300">
          <span>The new rate applies to all of this partner&apos;s referred deposits.</span>
          <div className="flex shrink-0 gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saving}
              onClick={saveRate}
              className="h-7 bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
            >
              {saving ? "Saving…" : "Save rate"}
            </Button>
          </div>
        </div>
      )}

      {/* Mark as paid */}
      <Button
        type="button"
        disabled={unpaid <= 0 || paying || editing}
        onClick={markPaid}
        className="h-10 w-full bg-[#F5C400] text-xs font-black uppercase tracking-wider text-black hover:bg-[#e0b300] disabled:opacity-40"
      >
        <Wallet className="mr-1.5 h-4 w-4" />
        {paying ? "Recording…" : unpaid > 0 ? `Mark as paid · ${ghs(unpaid)}` : "Nothing to pay"}
      </Button>

      {/* Payout history */}
      <div>
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          aria-expanded={showHistory}
          className="flex w-full items-center justify-center gap-1 text-[11px] font-bold text-gray-400 hover:text-white"
        >
          Payout history ({payouts.length})
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", showHistory && "rotate-180")}
          />
        </button>
        {showHistory && (
          <div className="mt-2 divide-y divide-[#24242d] rounded-xl border border-[#2a2a35] bg-[#121216]">
            {payouts.length === 0 ? (
              <p className="p-3 text-center text-[11px] text-gray-500">No payouts yet.</p>
            ) : (
              payouts.map((po) => (
                <div
                  key={po.id}
                  className="flex items-center justify-between gap-2 p-2.5 text-[11px]"
                >
                  <div>
                    <p className="font-bold text-gray-200">
                      {new Date(po.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        timeZone: GHANA_TZ,
                      })}
                    </p>
                    <p className="text-gray-500">
                      {po.commissionRate}% of {ghs(po.totalDepositsAt)}
                      {po.note ? ` • ${po.note}` : ""}
                    </p>
                  </div>
                  <span className="font-mono font-black text-emerald-400">{ghs(po.amount)}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
