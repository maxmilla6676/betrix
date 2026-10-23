import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { GHANA_TZ } from "@/lib/ghana-time";
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
  Trophy,
  ShieldAlert,
  LogIn,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BetrixWordmark } from "@/components/brand/Logo";
import { EmptyState, SectionHeading } from "@/components/common/States";
import { auditLog, growthSeries } from "@/data/admin";
import { teamById, leagueById } from "@/data/football";
import { useBetrix, formatGHS } from "@/store/betrix";
import { FREE_SPORTS_SOURCES } from "@/services/sportsApi";
import {
  deleteUserInBackend,
  fetchAllProfilesFromBackend,
  updateUserRoleInBackend,
} from "@/services/backendSync";
import { PartnerStatCard } from "@/components/admin/PartnerStatCard";
import { partnerEarnings } from "@/lib/partners";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DailyRevenueHistoryCard,
  formatGHC,
} from "@/components/admin/DailyRevenueHistoryCard";
import { AdminMatchManager } from "@/components/admin/AdminMatchManager";
import { ApiSportsSettingsCard } from "@/components/admin/ApiSportsSettingsCard";

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
  const [copiedPartnerRegLink, setCopiedPartnerRegLink] = useState(false);
  const [copiedUserLinkCode, setCopiedUserLinkCode] = useState<string | null>(null);
  const [pendingRates, setPendingRates] = useState<Record<string, number>>({});
  // Start with true (open) or allow user toggle via small calendar logo
  const [showDailyHistory, setShowDailyHistory] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminNavTab>("payments");

  const [isRefreshingRole, setIsRefreshingRole] = useState(false);
  const [supabaseProfiles, setSupabaseProfiles] = useState<any[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const {
    isLoggedIn,
    authReady,
    isAdmin,
    platformTransactions,
    profile,
    refreshProfile,
    totalRevenue,
    todayRevenue,
    devCommission,
    gatewayCommission,
    totalPartnersCount,
    totalUsersCount,
    activeAnalysesCount,
    pendingPaymentsCount,
    history,

    partnersList,
    partnerPayouts,
    markPartnerPaid,
    deletePartner,
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

  const transactions = platformTransactions.filter((t) => t.type === "DEPOSIT");

  useEffect(() => {
    if (!isAdmin) return;
    setLoadingProfiles(true);
    fetchAllProfilesFromBackend()
      .then(setSupabaseProfiles)
      .finally(() => setLoadingProfiles(false));
  }, [isAdmin]);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#0e0e11] text-gray-400 flex items-center justify-center text-sm">Loading…</div>
    );
  }

  // ── Protection Gate 1: Not Logged In ──
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#0e0e11] text-white flex flex-col items-center justify-center p-4 selection:bg-[#F5C400] selection:text-black">
        <div className="max-w-md w-full bg-[#16161c] border border-[#252532] rounded-3xl p-8 text-center shadow-2xl space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[#F5C400]">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-black text-white">Authentication Required</h2>
          <p className="text-xs text-gray-400 font-medium leading-relaxed">
            You must be logged into an authorized Administrator account to view the BETRIX console.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              to="/auth"
              search={{ redirect: "/admin" }}
              className="w-full bg-[#F5C400] hover:bg-[#e0b300] text-black font-black text-sm h-11 rounded-xl uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              <LogIn className="h-4 w-4" /> Log In as Administrator
            </Link>
            <Link
              to="/"
              className="text-xs text-gray-400 hover:text-white font-bold py-2 text-center"
            >
              ← Return to Sportsbook
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Protection Gate 2: Logged In, but Role is not ADMIN in Supabase ──
  if (!isAdmin) {
    const handleRecheck = async () => {
      setIsRefreshingRole(true);
      try {
        await refreshProfile();
        toast.info("Profile reloaded from Supabase.");
      } catch {
        toast.error("Failed to re-check permissions.");
      } finally {
        setIsRefreshingRole(false);
      }
    };

    return (
      <div className="min-h-screen bg-[#0e0e11] text-white flex flex-col items-center justify-center p-4 selection:bg-[#F5C400] selection:text-black">
        <div className="max-w-lg w-full bg-[#16161c] border border-rose-500/30 rounded-3xl p-8 text-center shadow-2xl space-y-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500" />
          
          <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white tracking-tight">Access Restricted</h2>
            <p className="text-xs font-bold text-rose-400 uppercase tracking-widest">
              403 Forbidden · Administrator Role Required
            </p>
          </div>

          <div className="bg-[#1e1e28] border border-[#2d2d3c] rounded-2xl p-4 text-left space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 font-semibold">Account Phone:</span>
              <span className="font-mono font-bold text-white">+{profile.phone || "Unknown"}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 font-semibold">Current Supabase Role:</span>
              <span className="px-2 py-0.5 rounded-md font-mono font-black text-xs bg-gray-700/50 text-gray-300">
                {profile.role || "USER"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 font-semibold">Required Role:</span>
              <span className="px-2 py-0.5 rounded-md font-mono font-black text-xs bg-[#F5C400]/10 text-[#F5C400] border border-[#F5C400]/30">
                ADMIN
              </span>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5 text-left text-xs text-amber-200/90 leading-relaxed">
            <p className="font-bold text-amber-300 mb-1 flex items-center gap-1.5">
              <span>💡</span> How to grant admin access in Supabase:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-gray-300">
              <li>Open your <strong>Supabase Dashboard</strong> → <strong>Table Editor</strong>.</li>
              <li>Select the <strong>profiles</strong> table.</li>
              <li>Find the row for phone <strong>{profile.phone}</strong>.</li>
              <li>Double-click the <strong>role</strong> column and change it to <strong>ADMIN</strong>.</li>
              <li>Click the button below to re-check your role immediately.</li>
            </ol>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <Button
              type="button"
              onClick={handleRecheck}
              disabled={isRefreshingRole}
              className="w-full bg-[#F5C400] hover:bg-[#e0b300] text-black font-black text-sm h-11 rounded-xl uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshingRole && "animate-spin")} />
              <span>{isRefreshingRole ? "Checking Supabase..." : "Re-Check Permission"}</span>
            </Button>
            <Link
              to="/"
              className="text-xs text-gray-400 hover:text-white font-bold py-2 text-center"
            >
              ← Return to Sportsbook
            </Link>
          </div>
        </div>
      </div>
    );
  }


  const pendingPartners = partnersList.filter((p) => p.status === "PENDING");
  const activePartners = partnersList.filter((p) => p.status === "APPROVED");
  const rejectedPartners = partnersList.filter((p) => p.status === "REJECTED");

  const handleDeletePartner = async (partnerId: string, partnerName: string) => {
    if (!confirm(`Delete the partner application from ${partnerName}? This can't be undone.`)) return;
    if (await deletePartner(partnerId)) toast.success(`${partnerName} deleted.`);
  };

  const handleDeleteUser = async (u: { id: string; phone: string; role: string; balance: number }) => {
    if (u.role === "ADMIN") {
      toast.error("This user is an admin. Demote them to user first.");
      return;
    }
    if (u.balance > 0) {
      toast.error(`This user still has ${formatGHC(u.balance)}. It must be withdrawn before the account can be deleted.`);
      return;
    }
    if (
      !confirm(
        `Permanently delete ${u.phone}?

They will no longer be able to log in. Their bet and transaction history is kept for your records. This can't be undone.`,
      )
    )
      return;
    setDeletingUserId(u.id);
    const res = await deleteUserInBackend(u.id);
    setDeletingUserId(null);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success(`User ${u.phone} deleted.`);
    setSupabaseProfiles((prev) => prev.filter((p) => p.id !== u.id));
    await refreshProfile();
  };
  const partnerTotals = activePartners.reduce(
    (acc, p) => {
      const e = partnerEarnings(p);
      return { deposits: acc.deposits + e.totalDeposits, earned: acc.earned + e.earned, unpaid: acc.unpaid + e.unpaid };
    },
    { deposits: 0, earned: 0, unpaid: 0 },
  );

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

  const loadProfiles = async () => {
    setLoadingProfiles(true);
    const data = await fetchAllProfilesFromBackend();
    setSupabaseProfiles(data);
    setLoadingProfiles(false);
  };


  const handleToggleRole = async (phone: string, currentRole: string) => {
    const newRole = currentRole === "ADMIN" ? "USER" : "ADMIN";
    const res = await updateUserRoleInBackend(phone, newRole);
    if (res.success) {
      toast.success(`User ${phone} role changed to ${newRole}!`);
      setSupabaseProfiles((prev) =>
        prev.map((p) => (p.phone === phone ? { ...p, role: newRole } : p))
      );
      if (phone === profile.phone) {
        await refreshProfile();
      }
    } else {
      toast.error(res.error || "Failed to update role");
    }
  };

  const filteredUsers = supabaseProfiles.filter((u) =>
    `${u.phone} ${u.userId} ${u.role}`.toLowerCase().includes(q.trim().toLowerCase())
  );

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

        {/* ── STAT CARDS ROW 2: Members, Partners, Gateway Commission, Dev Commission ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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

          {/* 5. Gateway Commission (15% of today's revenue, resets daily) */}
          <div
            onClick={() => setActiveTab("payments")}
            className="bg-[#121216] rounded-2xl p-4 border border-cyan-500/30 cursor-pointer hover:border-cyan-500/60 transition-all flex flex-col justify-between min-h-[95px] relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-900/10" />
            <div className="relative flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400">Gateway Commission</span>
              <CreditCard className="h-3.5 w-3.5 text-cyan-400/80" />
            </div>
            <p className="relative text-2xl font-black text-cyan-400 mt-2 font-mono">
              {formatGHC(gatewayCommission)}
            </p>
            <span className="relative text-[10px] text-cyan-400/60 mt-1">15% of today's revenue</span>
          </div>

          {/* 6. Dev Commission (15% of today's revenue, resets daily) */}
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
              {formatGHC(devCommission)}
            </p>
            <span className="relative text-[10px] text-[#F5C400]/50 mt-1">15% of today's revenue</span>
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
                    Review incoming user deposits, commissions (15% Gateway, 15% Developer), and revenue ledger.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-emerald-400 text-xs font-bold">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>SeevPlus MoMo Gateway Active</span>
                  </div>
                </div>
              </div>

              {/* Commission callouts (Gateway 15% & Dev 15%) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="rounded-xl p-3.5 bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5" /> Gateway 15% Daily Commission
                    </span>
                    <p className="text-[11px] text-cyan-400/70">
                      15% of today's incoming platform deposits:
                    </p>
                  </div>
                  <span className="font-mono text-base font-black text-cyan-400">
                    {formatGHC(gatewayCommission)}
                  </span>
                </div>

                <div className="rounded-xl p-3.5 bg-[#F5C400]/10 border border-[#F5C400]/30 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#F5C400] flex items-center gap-1.5">
                      <Percent className="h-3.5 w-3.5" /> Developer 15% Daily Commission
                    </span>
                    <p className="text-[11px] text-[#F5C400]/70">
                      15% of today's incoming platform deposits:
                    </p>
                  </div>
                  <span className="font-mono text-base font-black text-[#F5C400]">
                    {formatGHC(devCommission)}
                  </span>
                </div>
              </div>

              {/* Transactions log */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Recent Platform Deposits ({transactions.length})
                </h4>

                {transactions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500 bg-[#1e1e26] rounded-xl border border-dashed border-[#2a2a35]">
                    No deposit transactions yet. Live player deposits completed via SeevPlus or MoMo will automatically appear here.
                  </div>
                ) : (
                  <div className="divide-y divide-[#1f1f26] rounded-xl border border-[#2a2a35] overflow-hidden">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="p-3 flex items-center justify-between hover:bg-[#1e1e26] text-xs">
                        <div className="space-y-0.5">
                          <p className="font-mono font-bold text-white">{tx.reference}</p>
                          <p className="text-[10px] text-gray-500">{tx.method} • {new Date(tx.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: GHANA_TZ })}</p>
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

          {/* TAB: SETTINGS — API Sports & Configuration */}
          {activeTab === "settings" && (
            <div className="space-y-4">
              <ApiSportsSettingsCard />
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
                            <button type="button" onClick={() => handleDeletePartner(partner.id, partner.name)}
                              aria-label={`Delete application from ${partner.name}`} title="Delete application"
                              className="h-7 w-7 grid place-items-center rounded-md border border-[#2a2a35] text-[#E41B23]/70 hover:bg-[#E41B23]/10 hover:text-[#E41B23]">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                    Active Partners ({activePartners.length})
                  </h4>
                  {activePartners.length > 0 && (
                    <p className="text-[11px] text-gray-400">
                      Referred deposits <strong className="font-mono text-white">{formatGHC(partnerTotals.deposits)}</strong>
                      {" • "}Earned <strong className="font-mono text-white">{formatGHC(partnerTotals.earned)}</strong>
                      {" • "}Unpaid <strong className="font-mono text-emerald-400">{formatGHC(partnerTotals.unpaid)}</strong>
                    </p>
                  )}
                </div>
                {activePartners.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500 bg-[#1e1e26] rounded-xl border border-[#2a2a35]">
                    <Users2 className="h-8 w-8 mx-auto mb-2 opacity-30 text-gray-400" />
                    <p className="font-semibold text-gray-400">No active affiliate partners</p>
                    <p className="text-[11px] text-gray-500 mt-1">Share the Partner Registration Link above to onboard partners.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {activePartners.map((p) => (
                      <PartnerStatCard
                        key={p.id}
                        partner={p}
                        payouts={partnerPayouts.filter((po) => po.partnerId === p.id)}
                        onSaveRate={updatePartnerCommission}
                        onMarkPaid={(id) => markPartnerPaid(id)}
                        onDelete={deletePartner}
                      />
                    ))}
                  </div>
                )}
              </div>

              {rejectedPartners.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    Rejected Applications ({rejectedPartners.length})
                  </h4>
                  <div className="divide-y divide-[#1f1f26] rounded-xl border border-[#2a2a35]">
                    {rejectedPartners.map((rp) => (
                      <div key={rp.id} className="flex items-center justify-between gap-2 p-3 text-xs">
                        <div className="min-w-0">
                          <span className="font-bold text-gray-300">{rp.name}</span>
                          <span className="ml-2 font-mono text-gray-500">{rp.code}</span>
                          <span className="ml-2 text-gray-500">{rp.phone}</span>
                        </div>
                        <button type="button" onClick={() => handleDeletePartner(rp.id, rp.name)}
                          aria-label={`Delete application from ${rp.name}`} title="Delete application"
                          className="h-7 w-7 shrink-0 grid place-items-center rounded-md border border-[#2a2a35] text-[#E41B23]/70 hover:bg-[#E41B23]/10 hover:text-[#E41B23]">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SETTINGS */}
          {activeTab === "settings" && (
            <div className="bg-[#121216] rounded-2xl p-4 md:p-5 border border-[#2a2a35] shadow-sm space-y-4 text-xs">
              <h3 className="text-sm font-black text-white">Platform & Gateway Configuration</h3>
              <p className="text-gray-400">Configure payout gateways, mobile money rails, commissions (15% Gateway, 15% Developer), and risk parameters.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-xl border border-cyan-500/30 bg-[#1e1e26] space-y-1">
                  <span className="font-bold text-cyan-400">Gateway Cut</span>
                  <p className="text-gray-400">15% automatic daily calculation on all today's platform revenue.</p>
                  <span className="inline-block mt-2 font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                    Active (15.0%)
                  </span>
                </div>
                <div className="p-3.5 rounded-xl border border-[#F5C400]/30 bg-[#1e1e26] space-y-1">
                  <span className="font-bold text-[#F5C400]">Developer Cut</span>
                  <p className="text-gray-400">15% automatic daily calculation on all today's platform revenue.</p>
                  <span className="inline-block mt-2 font-mono font-bold text-[#F5C400] bg-[#F5C400]/10 px-2 py-0.5 rounded border border-[#F5C400]/30">
                    Active (15.0%)
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



          {/* TAB 5: USERS */}
          {activeTab === "users" && (
            <div className="bg-[#121216] rounded-2xl p-4 md:p-5 border border-[#2a2a35] shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2a2a35] pb-3">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Users2 className="h-4 w-4 text-[#E41B23]" />
                    Supabase Registered Members ({supabaseProfiles.length})
                  </h3>
                  <p className="text-xs text-gray-400">Inspect real user accounts, wallet balances, and grant or revoke ADMIN privileges.</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Input placeholder="Search by phone, user ID, role..."
                    value={q} onChange={(e) => setQ(e.target.value)}
                    className="h-8 text-xs bg-[#1e1e26] border-[#2a2a35] text-white placeholder:text-gray-500 w-full sm:w-56" />
                  <Button size="sm" variant="outline" onClick={loadProfiles} disabled={loadingProfiles}
                    className="h-8 text-xs text-gray-300 border-[#2a2a35] hover:bg-[#1e1e26] hover:text-white shrink-0">
                    <RefreshCw className={cn("h-3.5 w-3.5", loadingProfiles && "animate-spin")} />
                  </Button>
                </div>
              </div>
              <div className="divide-y divide-[#1f1f26] rounded-xl border border-[#2a2a35] overflow-hidden">
                {filteredUsers.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500 bg-[#1e1e26]">
                    <Users2 className="h-8 w-8 mx-auto mb-2 opacity-30 text-gray-400" />
                    <p className="font-semibold text-gray-400">No registered members found</p>
                    <p className="text-[11px] text-gray-500 mt-1">
                      {q.trim() ? "No registered members match your search criteria." : "Newly registered members from Supabase will appear here in real time."}
                    </p>
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                    const isUserAdmin = u.role === "ADMIN";
                    return (
                      <div key={u.id || u.phone} className="p-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-[#1e1e26] transition-colors text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white text-sm">{u.phone}</span>
                            <Badge className={cn("text-[10px] font-black uppercase px-2 py-0.5", isUserAdmin ? "bg-[#F5C400] text-black" : "bg-gray-800 text-gray-300 border border-gray-700")}>
                              {u.role}
                            </Badge>
                            {u.phone === profile.phone && (
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-400">
                            ID: <span className="font-mono text-gray-300">{u.userId}</span> • Wallet: <strong className="text-[#F5C400]">{formatGHC(u.balance)}</strong> • Joined {u.joined}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleRole(u.phone, u.role)}
                            className={cn(
                              "h-7 text-xs font-bold transition-all",
                              isUserAdmin
                                ? "border-amber-500/40 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                                : "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                            )}
                          >
                            {isUserAdmin ? "Demote to User" : "Promote to Admin"}
                          </Button>
                          {u.phone !== profile.phone && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              disabled={deletingUserId === u.id}
                              title={isUserAdmin ? "Demote to user before deleting" : "Delete user"}
                              aria-label={`Delete user ${u.phone}`}
                              className="h-7 w-7 grid place-items-center rounded-md border border-[#2a2a35] text-[#E41B23]/70 hover:bg-[#E41B23]/10 hover:text-[#E41B23] disabled:opacity-40"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
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
                      Add custom leagues and matches with logos, kickoff times and real final scores.
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
