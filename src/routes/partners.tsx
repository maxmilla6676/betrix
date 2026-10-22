import { useMemo, useState } from "react";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { Check, Clock, Copy, Users2, Wallet, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useBetrix } from "@/store/betrix";
import { cn } from "@/lib/utils";
import { GHANA_TZ } from "@/lib/ghana-time";
import { partnerEarnings } from "@/lib/partners";

export const Route = createFileRoute("/partners")({
  head: () => ({
    meta: [
      { title: "Partner Dashboard — BETRIX" },
      {
        name: "description",
        content:
          "Track deposits made by users you referred to BETRIX and the commission you've earned.",
      },
    ],
  }),
  component: PartnersPage,
});

const ghs = (n: number) =>
  `GH₵${n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: GHANA_TZ,
      })
    : "—";

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        accent ? "border-emerald-500/30 bg-emerald-500/10" : "border-[#2A264F] bg-[#1C1936]",
      )}
    >
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p
        className={cn(
          "mt-1 font-mono text-xl font-black",
          accent ? "text-emerald-400" : "text-white",
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-gray-400">{sub}</p>}
    </div>
  );
}

export function PartnersPage() {
  const search = useSearch({ strict: false }) as { partnerId?: string };
  const { partnersList, partnerDeposits, partnerPayouts, isLoggedIn, authReady, isAdmin, profile } =
    useBetrix();
  const [selectedId, setSelectedId] = useState(search?.partnerId || "");
  const [copied, setCopied] = useState<"link" | "code" | null>(null);

  // Non-admins only receive their own partner row (RLS); admins can switch between partners.
  const partner = isAdmin
    ? partnersList.find((p) => p.id === selectedId) ||
      partnersList.find((p) => p.status === "APPROVED")
    : partnersList.find((p) => p.phone === profile.phone) || partnersList[0];

  const deposits = useMemo(
    () => (partner ? partnerDeposits.filter((d) => d.partnerId === partner.id) : []),
    [partnerDeposits, partner],
  );
  const payouts = useMemo(
    () => (partner ? partnerPayouts.filter((po) => po.partnerId === partner.id) : []),
    [partnerPayouts, partner],
  );

  if (!partner) {
    return (
      <div className="mx-auto max-w-md space-y-3 p-6 text-center">
        <h1 className="text-xl font-black text-white">Partner Dashboard</h1>
        <p className="text-sm text-gray-400">
          {!authReady
            ? "Loading…"
            : isLoggedIn
              ? "No partner account is linked to your phone number yet."
              : "Log in with the phone number you used on your partner application to see your dashboard."}
        </p>
        {isLoggedIn ? (
          <Link
            to="/partner-register"
            className="inline-block rounded-xl bg-[#F5C400] px-4 py-2 text-xs font-black text-black"
          >
            Apply to become a partner
          </Link>
        ) : (
          <Link
            to="/auth"
            search={{ redirect: "/partners" }}
            className="inline-block rounded-xl bg-[#F5C400] px-4 py-2 text-xs font-black text-black"
          >
            Log in
          </Link>
        )}
      </div>
    );
  }

  const { totalDeposits, rate, earned, paidOut, unpaid } = partnerEarnings(partner);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = `${origin}/auth?mode=signup&ref=${partner.code}`;

  const copy = (what: "link" | "code") => {
    void navigator.clipboard.writeText(what === "link" ? link : partner.code);
    setCopied(what);
    toast.success(what === "link" ? "Referral link copied." : `Code ${partner.code} copied.`);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-3 md:p-6">
      <header className="space-y-3 rounded-3xl border border-[#2A264F] bg-gradient-to-br from-[#1C1936] to-[#121026] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-[#F5C400]">
              Partner Dashboard
            </p>
            <h1 className="mt-1 text-xl font-black text-white">{partner.name}</h1>
          </div>
          {isAdmin && partnersList.length > 1 && (
            <select
              value={partner.id}
              onChange={(e) => setSelectedId(e.target.value)}
              aria-label="Choose partner"
              className="h-9 rounded-xl border border-[#332E5E] bg-[#252147] px-3 text-xs font-bold text-white"
            >
              {partnersList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.status.toLowerCase()})
                </option>
              ))}
            </select>
          )}
        </div>

        {partner.status === "PENDING" && (
          <p className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-bold text-amber-400">
            <Clock className="h-4 w-4 shrink-0" /> Your application is awaiting admin approval. Your
            link starts tracking deposits once you&apos;re approved.
          </p>
        )}
        {partner.status === "REJECTED" && (
          <p className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-bold text-red-400">
            <XCircle className="h-4 w-4 shrink-0" /> This partner application was not approved.
          </p>
        )}

        {partner.status === "APPROVED" && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-300">
              Your referral link — share it so new users sign up through you:
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <code className="min-w-0 flex-1 truncate rounded-xl border border-[#332E5E] bg-[#252147] px-3 py-2.5 font-mono text-xs text-white">
                {link}
              </code>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => copy("link")}
                  className="flex items-center gap-1.5 rounded-xl bg-[#F5C400] px-4 py-2 text-xs font-black text-black"
                >
                  {copied === "link" ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}{" "}
                  Copy link
                </button>
                <button
                  type="button"
                  onClick={() => copy("code")}
                  className="rounded-xl border border-[#332E5E] px-3 py-2 font-mono text-xs font-bold text-[#F5C400]"
                >
                  {copied === "code" ? "Copied" : partner.code}
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      <section aria-label="Earnings" className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="col-span-2 md:col-span-1">
          <Stat
            label="Deposited via your link"
            value={ghs(totalDeposits)}
            sub={`${deposits.length} deposits`}
          />
        </div>
        <Stat label="Your commission" value={`${rate}%`} sub="Set by BETRIX" />
        <Stat label="Total earned" value={ghs(earned)} sub={`${rate}% of ${ghs(totalDeposits)}`} />
        <Stat label="Paid to you" value={ghs(paidOut)} sub={`${payouts.length} payouts`} />
        <Stat label="Awaiting payout" value={ghs(unpaid)} accent={unpaid > 0} />
        <Stat
          label="Users referred"
          value={String(partner.signups)}
          sub={`${partner.activeUsers} have deposited`}
        />
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-black text-white">
          <Users2 className="h-4 w-4 text-[#F5C400]" /> Deposits from your referrals
        </h2>
        <div className="divide-y divide-[#262247] rounded-2xl border border-[#2A264F] bg-[#1C1936]">
          {deposits.length === 0 ? (
            <p className="p-6 text-center text-xs text-gray-400">
              No deposits yet. When someone signs up with your link and deposits, it shows up here.
            </p>
          ) : (
            deposits.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 px-4 py-3 text-xs">
                <div>
                  <p className="font-mono font-bold text-white">{d.userPhone}</p>
                  <p className="text-gray-400">{day(d.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-black text-white">{ghs(d.amount)}</p>
                  <p className="font-mono text-emerald-400">
                    +{ghs(Math.round(d.amount * rate) / 100)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-black text-white">
          <Wallet className="h-4 w-4 text-[#F5C400]" /> Payout history
        </h2>
        <div className="divide-y divide-[#262247] rounded-2xl border border-[#2A264F] bg-[#1C1936]">
          {payouts.length === 0 ? (
            <p className="p-6 text-center text-xs text-gray-400">No payouts yet.</p>
          ) : (
            payouts.map((po) => (
              <div
                key={po.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-xs"
              >
                <div>
                  <p className="font-bold text-white">{day(po.createdAt)}</p>
                  <p className="text-gray-400">
                    {po.commissionRate}% of {ghs(po.totalDepositsAt)}
                  </p>
                </div>
                <p className="font-mono font-black text-emerald-400">{ghs(po.amount)}</p>
              </div>
            ))
          )}
        </div>
        <p className="text-[11px] text-gray-500">
          Commission is your current rate applied to all deposits made by users you referred. BETRIX
          pays out the amount awaiting payout and records it here.
        </p>
      </section>
    </div>
  );
}
