import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Activity,
  ArrowLeft,
  ShieldCheck,
  Users2,
  Ticket,
  Globe,
  RotateCw,
  RefreshCw,
  DollarSign,
  Calendar,
  Percent,
  Edit3,
  Check,
  Copy,
  ExternalLink,
  Clock,
  Sparkles,
  Share2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Mail,
  Phone,
  Radio,
  ChevronDown,
  Menu,
  CreditCard,
  Plus,
  RotateCcw,
  Trophy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BetrixWordmark } from "@/components/brand/Logo";
import { EmptyState, SectionHeading } from "@/components/common/States";
import { adminUsers, auditLog, growthSeries } from "@/data/admin";
import { teamById, leagueById } from "@/data/football";
import { useBetrix, formatGHS } from "@/store/betrix";
import { FREE_SPORTS_SOURCES } from "@/services/sportsApi";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DailyRevenueHistoryCard,
  formatGHC,
} from "@/components/admin/DailyRevenueHistoryCard";
import { AdminMatchManager } from "@/components/admin/AdminMatchManager";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin console — BETRIX" },
      {
        name: "description",
        content:
          "Review payments, partners, commission settings and platform activity.",
      },
    ],
  }),
  component: AdminPage,
});

type AdminNavTab =
  | "payments"
  | "settings"
  | "packages"
  | "partners"
  | "users"
  | "matches"
  | "audit";

function AdminPage() {
  const [q, setQ] = useState("");
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [editRateInput, setEditRateInput] = useState<number>(15);
  const [copiedPartnerRegLink, setCopiedPartnerRegLink] = useState(false);
  const [copiedUserLinkCode, setCopiedUserLinkCode] = useState<string | null>(null);
  const [pendingRates, setPendingRates] = useState<Record<string, number>>({});
  // Start with true (open) or allow user toggle via small calendar logo
  const [showDailyHistory, setShowDailyHistory] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminNavTab>("payments");

  const {
    totalRevenue,
    todayRevenue,
    devCommission,
    totalPartnersCount,
    totalUsersCount,
    activeAnalysesCount,
    pendingPaymentsCount,
    resetAllStatsToZero,
    loadScreenshotStats,
    simulateDeposit,
    transactions,
    history,
    partnersList,
    updatePartnerCommission,
    approvePartner,
    rejectPartner,
    allMatches,
    apiMatches,
    isApiLoading,
    fetchApiMatches,
    lastApiUpdate,
    apiLiveCount,
    apiSourcesFetched,
    enableLiveApi,
    setEnableLiveApi,
  } = useBetrix();

  const pendingPartners = partnersList.filter((p) => p.status === "PENDING");
  const approvedPartners = partnersList.filter((p) => p.status !== "PENDING");

  const partnerRegUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/partner-register`
      : "https://betrix.app/partner-register";

  const handleCopyPartnerRegLink = () => {
    navigator.clipboard.writeText(partnerRegUrl);
    setCopiedPartnerRegLink(true);
    toast.success("Partner registration link copied! Send to prospective partners.");
    setTimeout(() => setCopiedPartnerRegLink(false), 2500);
  };

  const handleCopyUserLink = (code: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://betrix.app";
    const userLink = `${origin}/auth?mode=signup&ref=${code}`;
    navigator.clipboard.writeText(userLink);
    setCopiedUserLinkCode(code);
    toast.success(`Unique referral link for ${code} copied!`);
    setTimeout(() => setCopiedUserLinkCode(null), 2500);
  };

  const handleApprovePartner = (partnerId: string, partnerName: string) => {
    const customRate = pendingRates[partnerId] ?? 12;
    approvePartner(partnerId, customRate);
    toast.success(`Approved ${partnerName}! Referral link active with ${customRate}% commission.`);
  };

  const handleRejectPartner = (partnerId: string, partnerName: string) => {
    rejectPartner(partnerId, "Application rejected by admin");
    toast.error(`Partner application for ${partnerName} rejected.`);
  };

  const handleResetStats = () => {
    resetAllStatsToZero();
    toast.success("All platform revenue, stat cards, and metrics reset to GH₵0.");
  };

  const handleRestoreScreenshotStats = () => {
    loadScreenshotStats();
    toast.success("Loaded reference stats matching the screenshot!");
  };

  const filteredUsers = adminUsers.filter((u) =>
    `${u.name} ${u.username} ${u.email}`.toLowerCase().includes(q.trim().toLowerCase())
  );

  const handleSaveCommission = (partnerId: string, partnerName: string) => {
    updatePartnerCommission(partnerId, editRateInput);
    toast.success(`Updated ${partnerName}'s commission percentage to ${editRateInput}%`);
    setEditingPartnerId(null);
  };

  return (
    <div className="min-h-screen bg-[#0e0e11] text-white font-sans selection:bg-[#F5C400] selection:text-black select-none pb-24">
      {/* ── TOP NAV HEADER (Exact Match: Logo left | '5 credits' + Menu right) ── */}
      <header className="sticky top-0 z-40 bg-[#0c0c0e]/95 backdrop-blur-md border-b border-[#1f1f26] shadow-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Link to="/" aria-label="BETRIX home" className="flex items-center gap-1.5 active:scale-95 transition-transform">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-[#E41B23] to-rose-600 text-white font-black text-xs shadow-xs">
                ▼
              </span>
              <BetrixWordmark />
            </Link>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 rounded-full bg-[#1e1e26] text-[#F5C400] text-xs font-bold border border-[#2a2a35]">
              Admin
            </span>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-lg text-gray-400 hover:bg-[#1e1e26] hover:text-white"
            >
              <Link to="/" title="Exit to website">
                <Menu className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── MAIN DASHBOARD CONTAINER ── */}
      <main className="mx-auto max-w-4xl px-4 py-5 space-y-4">
        {/* Title & Description */}
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Admin console
          </h1>
          <p className="text-xs text-gray-400 font-medium">
            Review payments, partners, commission settings and platform activity.
          </p>
        </div>

        {/* ── TOP STAT CARDS ROW 1: Revenue (gradient) ── */}
        <div className="grid grid-cols-2 gap-3">
          {/* 1. Total Revenue */}
          <div className="relative rounded-2xl p-4 md:p-5 text-white shadow-md bg-gradient-to-r from-[#cf143a] via-[#7329cd] to-[#2552df] overflow-hidden flex flex-col justify-between min-h-[110px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white/90 tracking-wide">Total Revenue</span>
              <DollarSign className="h-3.5 w-3.5 text-white/70" />
            </div>
            <p className="text-2xl md:text-3xl font-black font-mono tracking-tight text-white mt-2">
              {formatGHC(totalRevenue)}
            </p>
          </div>

          {/* 2. Today's Revenue (calendar toggle bottom-right) */}
          <div className="relative rounded-2xl p-4 md:p-5 text-white shadow-md bg-gradient-to-r from-[#cf143a] via-[#7329cd] to-[#2552df] overflow-hidden flex flex-col justify-between min-h-[110px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white/90 tracking-wide leading-tight">Today's<br className="sm:hidden" /> Revenue</span>
              <ChevronDown className="h-3.5 w-3.5 text-white/80" />
            </div>
            <p className="text-2xl md:text-3xl font-black font-mono tracking-tight text-white mt-2">
              {formatGHC(todayRevenue)}
            </p>
            <button
              type="button"
              onClick={() => setShowDailyHistory(!showDailyHistory)}
              title={showDailyHistory ? "Hide Daily Revenue History" : "Show Daily Revenue History"}
              className={cn(
                "absolute right-3.5 bottom-3.5 p-2 rounded-xl backdrop-blur-xs border transition-all cursor-pointer shadow-2xs",
                showDailyHistory
                  ? "bg-white/30 border-white/40 ring-2 ring-white/50"
                  : "bg-white/20 hover:bg-white/30 border-white/25 active:scale-95"
              )}
            >
              <Calendar className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>

        {/* ── DAILY REVENUE HISTORY ── */}
        {showDailyHistory && (
          <div className="animate-in fade-in-50 duration-300">
            <DailyRevenueHistoryCard />
          </div>
        )}

        {/* ── STAT CARDS ROW 2: Members, Partners, Dev Commission ── */}
        <div className="grid grid-cols-3 gap-3">
          {/* 3. Total Members */}
          <div
            onClick={() => setActiveTab("users")}
            className="bg-[#121216] rounded-2xl p-4 border border-[#2a2a35] cursor-pointer hover:border-[#F5C400]/40 transition-all flex flex-col justify-between min-h-[95px]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400">Members</span>
              <Users2 className="h-3.5 w-3.5 text-[#E41B23]" />
            </div>
            <p className="text-2xl font-black text-white mt-2 font-mono">
              {totalUsersCount}
            </p>
            <span className="text-[10px] text-gray-500 mt-1">Registered users</span>
          </div>

          {/* 4. Total Partners */}
          <div
            onClick={() => setActiveTab("partners")}
            className="bg-[#121216] rounded-2xl p-4 border border-[#2a2a35] cursor-pointer hover:border-[#F5C400]/40 transition-all flex flex-col justify-between min-h-[95px]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400">Partners</span>
              <Globe className="h-3.5 w-3.5 text-[#E41B23]" />
            </div>
            <p className="text-2xl font-black text-white mt-2 font-mono">
              {totalPartnersCount}
            </p>
            <span className="text-[10px] text-gray-500 mt-1">Active affiliates</span>
          </div>

          {/* 5. Dev Commission (20% of today's revenue) */}
          <div
            onClick={() => setActiveTab("payments")}
            className="bg-[#121216] rounded-2xl p-4 border border-[#F5C400]/30 cursor-pointer hover:border-[#F5C400]/60 transition-all flex flex-col justify-between min-h-[95px] relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#F5C400]/5 to-amber-900/10" />
            <div className="relative flex items-center justify-between">
              <span className="text-xs font-bold text-[#F5C400]">Dev Commission</span>
              <Percent className="h-3.5 w-3.5 text-[#F5C400]/70" />
            </div>
            <p className="relative text-2xl font-black text-[#F5C400] mt-2 font-mono">
              {formatGHC(todayRevenue * 0.20)}
            </p>
            <span className="relative text-[10px] text-[#F5C400]/50 mt-1">20% of today's income</span>
          </div>
        </div>

        {/* ── BOTTOM SEGMENTED NAVIGATION / TABS BAR (Exact Screenshot Pill Design) ── */}
        <div className="pt-2">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab("payments")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all",
                activeTab === "payments"
                  ? "bg-[#E41B23] text-white border border-[#E41B23] shadow-xs"
                  : "bg-[#1e1e26] text-gray-400 hover:text-white border border-[#2a2a35]"
              )}
            >
              Payments
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all",
                activeTab === "settings"
                  ? "bg-[#E41B23] text-white border border-[#E41B23] shadow-xs"
                  : "bg-[#1e1e26] text-gray-400 hover:text-white border border-[#2a2a35]"
              )}
            >
              Settings
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("packages")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all",
                activeTab === "packages"
                  ? "bg-[#E41B23] text-white border border-[#E41B23] shadow-xs"
                  : "bg-[#1e1e26] text-gray-400 hover:text-white border border-[#2a2a35]"
              )}
            >
              Packages & credits
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("partners")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all relative",
                activeTab === "partners"
                  ? "bg-[#E41B23] text-white border border-[#E41B23] shadow-xs"
                  : "bg-[#1e1e26] text-gray-400 hover:text-white border border-[#2a2a35]"
              )}
            >
              Partners
              {pendingPartners.length > 0 && (
                <span className="ml-1.5 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-black inline-flex items-center justify-center">
                  {pendingPartners.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("users")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all",
                activeTab === "users"
                  ? "bg-[#E41B23] text-white border border-[#E41B23] shadow-xs"
                  : "bg-[#1e1e26] text-gray-400 hover:text-white border border-[#2a2a35]"
              )}
            >
              Users
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("matches")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all",
                activeTab === "matches"
                  ? "bg-[#E41B23] text-white border border-[#E41B23] shadow-xs"
                  : "bg-[#1e1e26] text-gray-400 hover:text-white border border-[#2a2a35]"
              )}
            >
              Matches
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("audit")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all",
                activeTab === "audit"
                  ? "bg-[#E41B23] text-white border border-[#E41B23] shadow-xs"
                  : "bg-[#1e1e26] text-gray-400 hover:text-white border border-[#2a2a35]"
              )}
            >
              Audit log
            </button>
          </div>
        </div>

        {/* ── TAB CONTENT PANELS ── */}
        <div className="space-y-4">
          {/* TAB 1: PAYMENTS */}
          {activeTab === "payments" && (
            <div className="bg-[#121216] rounded-2xl p-4 md:p-5 border border-[#2a2a35] shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2a2a35] pb-3">
                <div>
                  <h3 className="text-sm font-black text-white">
                    Payment Gateway & Platform Revenue Control
                  </h3>
                  <p className="text-xs text-gray-400">
                    Review incoming user deposits, developer 20% commission, and revenue ledger.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetStats}
                    className="h-8 text-xs font-bold text-[#E41B23] border-[#E41B23]/30 hover:bg-[#E41B23]/10 hover:text-red-400"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Reset All to GH₵0
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRestoreScreenshotStats}
                    className="h-8 text-xs font-bold text-gray-700 border-gray-200 hover:bg-gray-50"
                  >
                    Restore Reference Stats
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      simulateDeposit(500);
                      toast.success("+GH₵500 deposit simulated into Today's Revenue!");
                    }}
                    className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    +GH₵500 MoMo Test
                  </Button>
                </div>
              </div>

              {/* Dev Commission callout */}
              <div className="rounded-xl p-3.5 bg-[#F5C400]/10 border border-[#F5C400]/30 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#F5C400]">
                    Developer 20% Daily Commission
                  </span>
                  <p className="text-[11px] text-[#F5C400]/70">
                    20% of today's incoming platform deposits (auto-calculated):
                  </p>
                </div>
                <span className="font-mono text-base font-black text-[#F5C400]">
                  {formatGHC(todayRevenue * 0.20)}
                </span>
              </div>

              {/* Transactions log */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Recent Platform Deposits ({transactions.length})
                </h4>

                {transactions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500 bg-[#1e1e26] rounded-xl border border-dashed border-[#2a2a35]">
                    No deposit transactions yet. Use "+GH₵500 MoMo Test" above to simulate transactions or click days on the Daily Revenue card.
                  </div>
                ) : (
                  <div className="divide-y divide-[#1f1f26] rounded-xl border border-[#2a2a35] overflow-hidden">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="p-3 flex items-center justify-between hover:bg-[#1e1e26] text-xs">
                        <div className="space-y-0.5">
                          <p className="font-mono font-bold text-white">{tx.reference}</p>
                          <p className="text-[10px] text-gray-500">{tx.method} • {new Date(tx.createdAt).toLocaleTimeString()}</p>
                        </div>
                        <span className="font-mono font-black text-emerald-600">
                          +{formatGHC(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PARTNERS */}
          {activeTab === "partners" && (
            <div className="bg-[#121216] rounded-2xl p-4 md:p-5 border border-[#2a2a35] shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2a2a35] pb-3">
                <div>
                  <h3 className="text-sm font-black text-white">
                    Partner Affiliates & Commission Controls
                  </h3>
                  <p className="text-xs text-gray-400">
                    Manage affiliate partners, approve incoming applications, and adjust commission rates.
                  </p>
                </div>
                <Button type="button" size="sm" onClick={handleCopyPartnerRegLink}
                  className="h-8 text-xs font-bold bg-[#E41B23] hover:bg-[#c0141e] text-white flex items-center gap-1.5">
                  {copiedPartnerRegLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedPartnerRegLink ? "Copied!" : "Copy Partner Reg Link"}</span>
                </Button>
              </div>

              {pendingPartners.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                      Pending Partner Applications ({pendingPartners.length})
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {pendingPartners.map((partner) => (
                      <div key={partner.id} className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-black text-white">{partner.name}</h4>
                              <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                {partner.code}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {partner.channel} • {partner.audienceSize || "Audience not specified"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button type="button" size="sm"
                              onClick={() => handleApprovePartner(partner.id, partner.name)}
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                              <Check className="h-3 w-3 mr-1" /> Approve
                            </Button>
                            <Button type="button" variant="outline" size="sm"
                              onClick={() => handleRejectPartner(partner.id, partner.name)}
                              className="h-7 text-xs text-[#E41B23] border-[#E41B23]/30 hover:bg-[#E41B23]/10">
                              <XCircle className="h-3 w-3 mr-1" /> Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                  Active Partners ({approvedPartners.length})
                </h4>
                <div className="divide-y divide-[#1f1f26] rounded-xl border border-[#2a2a35] overflow-hidden">
                  {approvedPartners.map((p) => (
                    <div key={p.id} className="p-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-[#1e1e26] transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{p.name}</span>
                          <span className="font-mono text-xs text-gray-400 bg-[#1e1e26] px-1.5 py-0.5 rounded border border-[#2a2a35]">
                            {p.code}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Commission Rate: <strong className="text-gray-300">{p.commissionRate}%</strong>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {editingPartnerId === p.id ? (
                          <div className="flex items-center gap-1.5">
                            <Input type="number" min={1} max={100} value={editRateInput}
                              onChange={(e) => setEditRateInput(Number(e.target.value))}
                              className="w-16 h-7 text-xs bg-[#1e1e26] border-[#2a2a35] text-white" />
                            <span className="text-xs font-bold text-gray-300">%</span>
                            <Button size="sm" className="h-7 text-xs bg-emerald-600 text-white"
                              onClick={() => handleSaveCommission(p.id, p.name)}>Save</Button>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm"
                            className="h-7 text-xs text-gray-300 border-[#2a2a35] hover:bg-[#1e1e26] hover:text-white"
                            onClick={() => { setEditingPartnerId(p.id); setEditRateInput(p.commissionRate); }}>
                            <Edit3 className="h-3 w-3 mr-1" /> Edit Rate
                          </Button>
                        )}
                        <Button variant="outline" size="sm"
                          className="h-7 text-xs text-gray-300 border-[#2a2a35] hover:bg-[#1e1e26] hover:text-white"
                          onClick={() => handleCopyUserLink(p.code)}>
                          <Share2 className="h-3 w-3 mr-1" /> Copy Link
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SETTINGS */}
          {activeTab === "settings" && (
            <div className="bg-[#121216] rounded-2xl p-4 md:p-5 border border-[#2a2a35] shadow-sm space-y-4 text-xs">
              <h3 className="text-sm font-black text-white">Platform & Gateway Configuration</h3>
              <p className="text-gray-400">Configure payout gateways, mobile money rails, developer revenue share (20%), and risk parameters.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl border border-[#2a2a35] bg-[#1e1e26] space-y-1">
                  <span className="font-bold text-white">Developer Cut</span>
                  <p className="text-gray-400">20% automatic calculation on all today's platform revenue.</p>
                  <span className="inline-block mt-2 font-mono font-bold text-[#F5C400] bg-[#F5C400]/10 px-2 py-0.5 rounded border border-[#F5C400]/30">
                    Active (20.0%)
                  </span>
                </div>
                <div className="p-3.5 rounded-xl border border-[#2a2a35] bg-[#1e1e26] space-y-1">
                  <span className="font-bold text-white">MoMo Rail Status</span>
                  <p className="text-gray-400">MTN & Telecel direct payment collections.</p>
                  <span className="inline-block mt-2 font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                    Connected (Ghana Cedi GH₵)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PACKAGES */}
          {activeTab === "packages" && (
            <div className="bg-[#121216] rounded-2xl p-4 md:p-5 border border-[#2a2a35] shadow-sm space-y-4">
              <h3 className="text-sm font-black text-white">VIP Credit Packages & Access Plans</h3>
              <p className="text-xs text-gray-400">Manage credit bundles offered to users for premium match insights.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-[#2a2a35] bg-[#1e1e26] space-y-2">
                  <span className="text-xs font-bold text-gray-400">Starter Pack</span>
                  <p className="text-xl font-black text-white font-mono">GH₵20</p>
                  <p className="text-[11px] text-gray-500">5 VIP analysis credits</p>
                </div>
                <div className="p-3.5 rounded-xl border border-[#E41B23]/30 bg-[#E41B23]/5 space-y-2">
                  <span className="text-xs font-bold text-[#E41B23]">Pro Analyst</span>
                  <p className="text-xl font-black text-white font-mono">GH₵50</p>
                  <p className="text-[11px] text-gray-400">15 VIP credits + priority sync</p>
                </div>
                <div className="p-3.5 rounded-xl border border-[#F5C400]/20 bg-[#F5C400]/5 space-y-2">
                  <span className="text-xs font-bold text-[#F5C400]">Elite Syndicate</span>
                  <p className="text-xl font-black text-white font-mono">GH₵150</p>
                  <p className="text-[11px] text-gray-400">50 credits + all leagues access</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: USERS */}
          {activeTab === "users" && (
            <div className="bg-[#121216] rounded-2xl p-4 md:p-5 border border-[#2a2a35] shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2a2a35] pb-3">
                <div>
                  <h3 className="text-sm font-black text-white">
                    Platform Registered Members ({totalUsersCount})
                  </h3>
                  <p className="text-xs text-gray-400">Inspect user accounts, active slips, and registration statuses.</p>
                </div>
                <div className="w-full sm:w-64">
                  <Input placeholder="Search users by name, username..."
                    value={q} onChange={(e) => setQ(e.target.value)}
                    className="h-8 text-xs bg-[#1e1e26] border-[#2a2a35] text-white placeholder:text-gray-500" />
                </div>
              </div>
              <div className="divide-y divide-[#1f1f26] rounded-xl border border-[#2a2a35] overflow-hidden">
                {filteredUsers.map((u) => (
                  <div key={u.id} className="p-3 flex items-center justify-between hover:bg-[#1e1e26] transition-colors text-xs">
                    <div>
                      <span className="font-bold text-white">{u.name}</span>
                      <p className="text-[11px] text-gray-500">{u.email} • Joined {u.joined}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold border-[#2a2a35] text-gray-400">
                      {u.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: MATCHES — Admin Match & League Manager */}
          {activeTab === "matches" && (
            <div className="space-y-4">
              <div className="bg-[#121216] rounded-2xl p-4 md:p-5 border border-[#2a2a35] shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2a2a35] pb-3 mb-4">
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-[#E41B23]" /> Match & League Manager
                    </h3>
                    <p className="text-xs text-gray-400">
                      Add custom leagues and matches with logos, kickoff times, and predetermined outcomes.
                    </p>
                  </div>
                  <Button size="sm" onClick={() => fetchApiMatches()} disabled={isApiLoading}
                    className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                    <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isApiLoading && "animate-spin")} />
                    {isApiLoading ? "Syncing..." : "Sync Live API"}
                  </Button>
                </div>
                <AdminMatchManager />
              </div>
            </div>
          )}

          {/* TAB 7: AUDIT */}
          {activeTab === "audit" && (
            <div className="bg-[#121216] rounded-2xl p-4 md:p-5 border border-[#2a2a35] shadow-sm space-y-4">
              <h3 className="text-sm font-black text-white">Security & Platform Audit Log</h3>
              <div className="divide-y divide-[#1f1f26] rounded-xl border border-[#2a2a35] overflow-hidden">
                {auditLog.map((log) => (
                  <div key={log.id} className="p-3 text-xs flex items-center justify-between hover:bg-[#1e1e26] transition-colors">
                    <div>
                      <span className="font-bold text-white">{log.action}</span>
                      <p className="text-[10px] text-gray-500">Actor: {log.actor}</p>
                    </div>
                    <span className="text-[11px] text-gray-500 font-mono">{log.at}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
