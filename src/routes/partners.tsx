import { useState, useMemo } from "react";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import {
  Copy,
  Share2,
  Users2,
  DollarSign,
  Percent,
  ShieldCheck,
  ArrowUpRight,
  Check,
  ExternalLink,
  Sparkles,
  Clock,
  AlertCircle,
  PlusCircle,
  TrendingUp,
  CreditCard,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/common/States";
import { formatGHS, useBetrix } from "@/store/betrix";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/partners")({
  head: () => ({
    meta: [
      { title: "Partner & Affiliate Portal — BETRIX" },
      {
        name: "description",
        content:
          "Track user deposits, monitor your real commission earnings, and manage your unique registration referral link on BETRIX.",
      },
      { property: "og:title", content: "Partner & Affiliate Portal — BETRIX" },
      {
        property: "og:description",
        content:
          "Track user deposits, unique referral links, and earn real commission on BETRIX.",
      },
    ],
  }),
  component: PartnersPage,
});

export function PartnersPage() {
  const search = useSearch({ strict: false }) as { partnerId?: string };
  const {
    partnersList,
    partnerDeposits,
    simulateUserDepositForPartner,
  } = useBetrix();

  const [selectedPartnerId, setSelectedPartnerId] = useState<string>(
    search?.partnerId || "p1"
  );
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [simAmount, setSimAmount] = useState<number>(500);

  // Active Partner selection
  const activePartner =
    partnersList.find((p) => p.id === selectedPartnerId) ||
    partnersList.find((p) => p.status === "APPROVED") ||
    partnersList[0];

  if (!activePartner) return null;

  const isPending = activePartner.status === "PENDING";
  const partnerCode = activePartner.code;
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://betrix.app";
  const registrationLink = `${origin}/auth?mode=signup&ref=${partnerCode}`;
  const totalEarned =
    activePartner.totalDeposits * (activePartner.commissionRate / 100);

  // Filter deposits attributed to this active partner
  const relevantDeposits = useMemo(() => {
    return partnerDeposits.filter(
      (d) => d.partnerId === activePartner.id || d.partnerCode === activePartner.code
    );
  }, [partnerDeposits, activePartner]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(registrationLink);
    setCopiedLink(true);
    toast.success("Unique partner registration link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(partnerCode);
    setCopiedCode(true);
    toast.success(`Referral code ${partnerCode} copied!`);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleSimulateDeposit = (amt: number) => {
    simulateUserDepositForPartner(activePartner.id, amt);
    const cut = amt * (activePartner.commissionRate / 100);
    toast.success(
      `Simulated user deposit of GHS ${amt.toFixed(2)}! You earned +GHS ${cut.toFixed(2)} commission.`
    );
  };

  return (
    <div className="space-y-6 p-3 md:p-6 max-w-5xl mx-auto">
      {/* ── TOP BANNER & PARTNER ACCOUNT SWITCHER ── */}
      <section className="bg-gradient-to-br from-[#1C1936] to-[#121026] border border-[#2A264F] rounded-3xl p-5 md:p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#F5C400]" />
              <h1 className="text-xl font-black text-white tracking-wide">
                BETRIX Partner & Affiliate Portal
              </h1>
              <Badge
                className={cn(
                  "text-[10px] font-bold uppercase",
                  isPending
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                )}
              >
                {isPending ? "Pending Approval" : "Approved & Active"}
              </Badge>
            </div>
            <p className="text-xs text-gray-300 mt-1">
              Give your unique registration link to users. Track their deposits and earn guaranteed commissions.
            </p>
          </div>

          {/* Partner Account Selector & Register Link */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-[#121026] p-1.5 rounded-2xl border border-[#2A264F]">
              <span className="text-[11px] font-bold text-gray-400 pl-2">Partner:</span>
              <select
                value={selectedPartnerId}
                onChange={(e) => setSelectedPartnerId(e.target.value)}
                className="bg-[#1C1936] border border-[#2A264F] text-white text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#F5C400]"
              >
                {partnersList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code}) {p.status === "PENDING" ? "⏳ Pending" : "✓"}
                  </option>
                ))}
              </select>
            </div>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-[#2A264F] bg-[#14122b] text-xs font-bold text-gray-300 hover:text-white"
            >
              <Link to="/partner-register" className="flex items-center gap-1.5">
                <PlusCircle className="h-3.5 w-3.5 text-[#F5C400]" />
                <span>New Application</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* ── ACCESS RESTRICTION IF PENDING APPROVAL ── */}
        {isPending ? (
          <div className="bg-[#19152b] border-2 border-amber-500/40 rounded-2xl p-6 text-center space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 grid place-items-center mx-auto shadow-lg">
              <Clock className="h-7 w-7 animate-pulse" />
            </div>

            <div className="space-y-1.5 max-w-lg mx-auto">
              <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-extrabold uppercase tracking-widest px-3 py-0.5">
                Application Under Review
              </Badge>
              <h2 className="text-xl font-black text-white">
                Partnership Approval Pending for {activePartner.name}
              </h2>
              <p className="text-xs text-gray-300 leading-relaxed">
                Your partnership account has been registered with preferred code{" "}
                <strong className="font-mono text-[#F5C400]">{activePartner.code}</strong>.
                An administrator must approve your application on the BETRIX Admin Dashboard before
                your unique referral link, deposit tracking, and commission payouts are activated.
              </p>
            </div>

            {/* Application Details Summary */}
            <div className="bg-[#121020] border border-[#2a264a] rounded-xl p-3.5 max-w-md mx-auto text-left text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Marketing Channel:</span>
                <span className="font-bold text-white">{activePartner.channel || "Direct"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Ghana Contact:</span>
                <span className="font-mono font-bold text-white">🇬🇭 {activePartner.phone || "On file"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Proposed Rate:</span>
                <span className="font-mono font-bold text-[#F5C400]">{activePartner.commissionRate}% Commission</span>
              </div>
            </div>

            {/* Admin Fast-Track Button */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                asChild
                className="bg-[#F5C400] hover:bg-[#e0b300] text-black font-black text-xs h-10 rounded-xl px-6 uppercase tracking-wider"
              >
                <Link to="/admin">
                  <ShieldCheck className="h-4 w-4 mr-1.5" />
                  <span>Go to Admin Dashboard to Approve</span>
                </Link>
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  const approvedOne = partnersList.find((p) => p.status === "APPROVED");
                  if (approvedOne) setSelectedPartnerId(approvedOne.id);
                }}
                className="border-[#2A264F] bg-[#14122b] text-gray-300 font-bold text-xs h-10 rounded-xl px-4 hover:bg-[#1f1b3d]"
              >
                <span>View Approved Partner Portal (Demo)</span>
              </Button>
            </div>
          </div>
        ) : (
          /* ── UNIQUE PARTNER REGISTRATION LINK CARD ── */
          <div className="bg-[#14122b] border border-[#2A264F] rounded-2xl p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-[#F5C400] uppercase tracking-wider">
                  Your Unique User Registration Link
                </span>
                <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold">
                  Active & Tracking
                </Badge>
              </div>
              <Badge className="bg-[#F5C400]/10 text-[#F5C400] border border-[#F5C400]/30 text-[10px] font-mono font-bold">
                {activePartner.code}
              </Badge>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Input
                  type="text"
                  readOnly
                  value={registrationLink}
                  className="bg-[#1C1936] border-[#2A264F] text-white font-mono text-xs h-11 rounded-xl pr-10"
                />
                <a
                  href={registrationLink}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#F5C400]"
                  title="Preview registration link"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>

              <Button
                onClick={handleCopyLink}
                className="bg-[#F5C400] hover:bg-[#e0b300] text-black font-black text-xs h-11 rounded-xl px-5 flex items-center justify-center gap-2 shadow-md uppercase tracking-wider shrink-0"
              >
                {copiedLink ? <Check className="h-4 w-4 stroke-[3]" /> : <Copy className="h-4 w-4" />}
                <span>{copiedLink ? "Link Copied!" : "Copy Registration Link"}</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleCopyCode}
                className="border-[#2A264F] bg-[#1C1936] text-white font-bold text-xs h-11 rounded-xl px-4 flex items-center justify-center gap-2 hover:bg-[#252147] shrink-0"
              >
                <Share2 className="h-4 w-4 text-[#F5C400]" />
                <span>{copiedCode ? "Code Copied!" : `Copy Code (${partnerCode})`}</span>
              </Button>
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed">
              Give this registration link to your users to create accounts and deposit on the website.
              Every deposit they make is automatically attributed to you and earns you {activePartner.commissionRate}% commission.
            </p>
          </div>
        )}
      </section>

      {/* ── METRICS AND REAL-TIME DATA (SHOWN FOR APPROVED PARTNERS) ── */}
      {!isPending && (
        <>
          {/* ── PARTNER METRICS CARDS ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* User Deposits */}
            <div className="bg-[#1C1936] border border-[#2A264F] rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between text-gray-400">
                <span className="text-[10px] font-extrabold uppercase tracking-wider">User Deposits</span>
                <DollarSign className="h-4 w-4 text-[#F5C400]" />
              </div>
              <p className="font-mono text-2xl font-black text-white">
                {formatGHS(activePartner.totalDeposits)}
              </p>
              <p className="text-[10px] text-gray-400 font-medium">Deposited via your unique link</p>
            </div>

            {/* Commission Rate */}
            <div className="bg-[#1C1936] border border-[#2A264F] rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between text-gray-400">
                <span className="text-[10px] font-extrabold uppercase tracking-wider">Commission Rate</span>
                <Percent className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="font-mono text-2xl font-black text-emerald-400">
                {activePartner.commissionRate}%
              </p>
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-gray-400">
                <ShieldCheck className="h-3 w-3 text-emerald-400" /> Set by Admin
              </span>
            </div>

            {/* Total Earned */}
            <div className="bg-[#1C1936] border border-[#2A264F] rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between text-gray-400">
                <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Earned</span>
                <ArrowUpRight className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="font-mono text-2xl font-black text-[#F5C400]">
                {formatGHS(totalEarned)}
              </p>
              <p className="text-[10px] text-gray-400 font-medium">{activePartner.commissionRate}% of user deposits</p>
            </div>

            {/* Referred Users */}
            <div className="bg-[#1C1936] border border-[#2A264F] rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between text-gray-400">
                <span className="text-[10px] font-extrabold uppercase tracking-wider">Referred Users</span>
                <Users2 className="h-4 w-4 text-blue-400" />
              </div>
              <p className="font-mono text-2xl font-black text-white">
                {activePartner.signups}
              </p>
              <p className="text-[10px] text-gray-400 font-medium">{activePartner.activeUsers} active depositors</p>
            </div>
          </div>

          {/* ── EARNINGS ESTIMATOR CALCULATOR ── */}
          <div className="bg-[#14122b] border border-[#2A264F] rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-[#F5C400] flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" />
                  <span>Referral Commission Calculator</span>
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Your agreed commission rate is <span className="font-bold text-white">{activePartner.commissionRate}%</span> of every deposit made by users you refer.
                </p>
              </div>

              <Badge variant="outline" className="text-[10px] font-bold text-gray-400 border-gray-700 w-fit">
                Live Rate
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {[100, 250, 500, 1000].map((amt) => {
                const previewCut = amt * (activePartner.commissionRate / 100);
                return (
                  <div
                    key={amt}
                    className="border border-[#2A264F] bg-[#1C1936] rounded-xl p-2.5 text-center"
                  >
                    <span className="text-xs font-bold text-gray-300">GHS {amt} Deposit</span>
                    <p className="text-emerald-400 font-mono font-bold text-xs mt-0.5">
                      +GHS {previewCut.toFixed(2)} earn
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── RECENT USER DEPOSITS ATTRIBUTED TO PARTNER ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <SectionHeading
                title="Recent Referred User Deposits"
                subtitle={`Live user deposits registered with referral link: ${partnerCode}`}
              />
              <Badge className="bg-[#1C1936] text-gray-300 border border-[#2A264F] text-[10px] font-mono">
                {relevantDeposits.length} Records
              </Badge>
            </div>

            {relevantDeposits.length === 0 ? (
              <div className="bg-[#1C1936] border border-[#2A264F] rounded-2xl p-8 text-center text-xs text-gray-400 space-y-2">
                <Users2 className="h-8 w-8 text-gray-600 mx-auto" />
                <p className="font-bold text-white">No deposits registered yet</p>
                <p className="text-gray-400 max-w-sm mx-auto">
                  When users register using your unique link <span className="font-mono text-[#F5C400]">{activePartner.code}</span> and complete deposits via the gateway, their transactions and your commission earnings will appear here in real time.
                </p>
              </div>
            ) : (
              <div className="bg-[#1C1936] border border-[#2A264F] rounded-2xl overflow-hidden divide-y divide-[#262247] shadow-lg">
                {relevantDeposits.map((d) => {
                  const partnerCut = d.commissionEarned || d.amount * (activePartner.commissionRate / 100);
                  return (
                    <div
                      key={d.id}
                      className="p-4 flex items-center justify-between gap-3 text-xs hover:bg-[#201d3d] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold">
                          GHS
                        </div>
                        <div>
                          <p className="font-extrabold text-white flex items-center gap-2">
                            <span>User {d.userPhone} Deposited</span>
                            <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] py-0 px-1.5 font-bold">
                              {d.status}
                            </Badge>
                          </p>
                          <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                            {d.date} · Attributed to code {activePartner.code}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-mono font-black text-sm text-white">
                          {formatGHS(d.amount)}
                        </p>
                        <p className="text-[10px] font-mono font-bold text-emerald-400">
                          +{formatGHS(partnerCut)} commission ({activePartner.commissionRate}%)
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
