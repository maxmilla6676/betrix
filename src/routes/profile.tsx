import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Bell,
  CheckCircle2,
  ChevronRight,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  HelpCircle,
  Key,
  LogOut,
  MessageCircle,
  Receipt,
  Settings,
  ShieldCheck,
  Star,
  Wallet,
  Smartphone,
  Coins,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBetrix } from "@/store/betrix";
import { cn } from "@/lib/utils";
import { BetrixLogo } from "@/components/brand/Logo";

import { PaymentGatewayModal } from "@/components/payment/PaymentGatewayModal";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Me / Account — BETRIX Sportsbook" },
      { name: "description", content: "Manage your BETRIX account, real money balance, deposits and withdrawals." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const { profile, balance, history, transactions, isLoggedIn, logout, withdraw } = useBetrix();
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(50);
  const [withdrawMethod, setWithdrawMethod] = useState("MTN Mobile Money");
  const [withdrawAccount, setWithdrawAccount] = useState(profile.phone || "0205795789");
  const [showBalance, setShowBalance] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) {
      void navigate({ to: "/auth", search: { redirect: "/profile" } });
    }
  }, [isLoggedIn, navigate]);

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawAmount > balance) {
      toast.error("Insufficient balance for withdrawal!");
      return;
    }
    const success = withdraw(withdrawAmount, withdrawMethod, withdrawAccount);
    if (success) {
      toast.success(`Withdrawal of GHS ${withdrawAmount.toFixed(2)} initiated successfully!`);
      setWithdrawOpen(false);
    } else {
      toast.error("Withdrawal failed due to insufficient funds.");
    }
  };

  const handleSignOut = () => {
    logout();
    toast.info("Signed out of BETRIX account");
    void navigate({ to: "/auth" });
  };

  const copyId = () => {
    navigator.clipboard.writeText(profile.userId);
    toast.success("User ID copied to clipboard!");
  };

  if (!isLoggedIn) {
    return null;
  }

  const userPhone = profile.phone || "0205795789";

  return (
    <div className="min-h-screen bg-[#121026] text-white p-3 md:p-6 space-y-4 pb-24">

      {/* ── REAL PAYMENT GATEWAY MODAL ── */}
      <PaymentGatewayModal open={depositOpen} onOpenChange={setDepositOpen} defaultAmount={300} />

      {/* ── WITHDRAWAL MODAL ── */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="bg-[#1C1936] text-white border-[#2A264F] max-w-sm rounded-3xl p-5 shadow-2xl">
          <DialogHeader className="text-left border-b border-[#2A264F] pb-3">
            <DialogTitle className="flex items-center gap-2 text-white font-black text-lg">
              <ArrowUpRight className="h-5 w-5 text-white" /> Fast Withdrawal (GHS)
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleWithdraw} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Method</label>
              <select
                value={withdrawMethod}
                onChange={(e) => setWithdrawMethod(e.target.value)}
                className="w-full bg-[#252147] border-[#332E5E] text-white font-bold text-xs h-10 rounded-xl px-3 focus:outline-none focus:border-[#FFC82C]"
              >
                <option value="MTN Mobile Money">MTN Mobile Money</option>
                <option value="Telecel Cash">Telecel Cash (Vodafone)</option>
                <option value="AT Money">AT Money (AirtelTigo)</option>
                <option value="Bank Account">Direct Bank Transfer</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mobile Number / Account</label>
              <Input
                type="text"
                value={withdrawAccount}
                onChange={(e) => setWithdrawAccount(e.target.value)}
                className="bg-[#252147] border-[#332E5E] text-white font-mono text-sm font-bold h-10 rounded-xl focus:border-[#FFC82C]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Withdrawal Amount (GHS)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-[#FFC82C]">GHS</span>
                <Input 
                  type="number" 
                  min={1}
                  value={withdrawAmount} 
                  onChange={(e) => setWithdrawAmount(Number(e.target.value))} 
                  className="bg-[#252147] border-[#332E5E] text-white font-mono text-base font-bold pl-14 h-11 rounded-xl focus:border-[#FFC82C]" 
                />
              </div>
            </div>
            <Button type="submit" className="w-full bg-[#FFC82C] hover:bg-[#e0b300] text-black font-black text-sm h-11 rounded-xl uppercase tracking-wider shadow-md">
              Submit Instant Cash Out
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── 1. USER PROFILE HEADER (Exact Replica of Screenshot 1) ── */}
      <div className="flex items-start justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          {/* Avatar with lime glowing ring */}
          <div className="relative h-16 w-16 shrink-0 rounded-full bg-[#121026] border-2 border-[#9FEF00] flex items-center justify-center shadow-[0_0_15px_rgba(159,239,0,0.3)]">
            <span className="text-xl font-black text-white">0</span>
          </div>

          {/* User Details */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <span className="text-lg font-black text-white tracking-wide">{userPhone}</span>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>

            {/* Badges Row */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 bg-[#092B15] text-[#4ADE80] border border-[#166534] px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                <CheckCircle2 className="h-3 w-3" /> VERIFIED
              </span>
              <button 
                onClick={copyId}
                className="inline-flex items-center gap-1 bg-[#201D3D] text-gray-300 border border-[#302B5C] px-2 py-0.5 rounded-full text-[10px] font-bold hover:bg-[#29254F] transition-colors"
              >
                <span>ID {profile.userId}</span>
                <Copy className="h-2.5 w-2.5 text-gray-400" />
              </button>
            </div>

            {/* VIP Tier Badge & Progress */}
            <div className="flex items-center gap-2 pt-0.5">
              <span className="inline-flex items-center gap-1 bg-[#78350F] text-[#FCD34D] border border-[#B45309] px-2 py-0.5 rounded-md text-[10px] font-black uppercase">
                <Star className="h-3 w-3 fill-[#FCD34D]" /> BRONZE I
              </span>
              <span className="text-[11px] font-semibold text-gray-400">
                Next update: {profile.nextUpdateDate}
              </span>
            </div>

            {/* Tier Progress Bar */}
            <div className="w-full bg-[#242147] h-1.5 rounded-full overflow-hidden mt-1">
              <div className="bg-gradient-to-r from-[#F59E0B] to-[#9FEF00] h-full w-[25%]" />
            </div>
          </div>
        </div>

        {/* Settings gear top right */}
        <button 
          onClick={() => toast.info("Settings modal opened")}
          className="p-2.5 rounded-2xl bg-[#1C1936] border border-[#2A264F] text-gray-300 hover:text-white hover:bg-[#252147] transition-all"
          title="Settings"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {/* ── 2. TOTAL BALANCE CARD (Exact Replica of Screenshot 1) ── */}
      <div className="bg-[#1C1936] border border-[#2A264F] rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-gray-400 uppercase tracking-widest">TOTAL BALANCE</span>
          <button onClick={() => setShowBalance(!showBalance)} className="text-gray-400 hover:text-white transition-colors">
            {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-lg font-black text-[#FFC82C]">GHS</span>
          <span className="font-mono text-3xl font-black text-white">
            {showBalance ? balance.toFixed(2) : "••••••"}
          </span>
        </div>

        {/* Deposit & Withdraw Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Button
            onClick={() => setDepositOpen(true)}
            className="bg-[#FFC82C] hover:bg-[#e0b024] text-black font-black text-sm h-12 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all"
          >
            <Wallet className="h-4 w-4 fill-black text-black" />
            <span>Deposit</span>
          </Button>

          <Button
            onClick={() => setWithdrawOpen(true)}
            className="bg-[#232046] hover:bg-[#2c2857] text-white border border-[#343063] font-black text-sm h-12 rounded-2xl flex items-center justify-center gap-2 transition-all"
          >
            <ArrowUpRight className="h-4 w-4" />
            <span>Withdraw</span>
          </Button>
        </div>
      </div>

      {/* ── 3. STATS SUMMARY GRID (Exact Replica of Screenshot 1) ── */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[#1C1936] border border-[#2A264F] rounded-2xl p-3 text-center">
          <p className="font-mono text-lg font-black text-white">{history.length}</p>
          <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mt-0.5">BETS PLACED</p>
        </div>

        <div className="bg-[#1C1936] border border-[#2A264F] rounded-2xl p-3 text-center">
          <p className="font-mono text-sm font-black text-white pt-1">{profile.memberSince}</p>
          <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mt-1">MEMBER SINCE</p>
        </div>

        <div className="bg-[#1C1936] border border-[#2A264F] rounded-2xl p-3 text-center">
          <p className="font-mono text-sm font-black text-[#FFC82C] pt-1">{profile.status}</p>
          <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mt-1">STATUS</p>
        </div>
      </div>

      {/* ── 4. GROUPED SECTION 1: ACCOUNT (Exact Replica of Screenshot 1) ── */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center gap-2 px-1">
          <div className="w-1 h-4 bg-[#9FEF00] rounded-full" />
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">ACCOUNT</h2>
        </div>

        <div className="bg-[#1C1936] border border-[#2A264F] rounded-3xl overflow-hidden divide-y divide-[#262247]">
          
          {/* Transaction History */}
          <button 
            onClick={() => setDepositOpen(true)}
            className="w-full flex items-center justify-between p-4 hover:bg-[#221F45] transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#00A859] flex items-center justify-center shrink-0">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-black text-white">Transaction History</p>
                <p className="text-xs font-medium text-gray-400">Deposits & withdrawals</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-500" />
          </button>

          {/* Bet History */}
          <Link 
            to="/history"
            className="flex items-center justify-between p-4 hover:bg-[#221F45] transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#9FEF00] flex items-center justify-center shrink-0">
                <Receipt className="h-5 w-5 text-black" />
              </div>
              <div>
                <p className="text-sm font-black text-white">Bet History</p>
                <p className="text-xs font-medium text-gray-400">Your past bets</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-500" />
          </Link>

          {/* Change Password */}
          <button 
            onClick={() => toast.info("Password update screen")}
            className="w-full flex items-center justify-between p-4 hover:bg-[#221F45] transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#8B5CF6] flex items-center justify-center shrink-0">
                <Key className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-black text-white">Change Password</p>
                <p className="text-xs font-medium text-gray-400">Update your password</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-500" />
          </button>

          {/* Notifications */}
          <Link 
            to="/notifications"
            className="flex items-center justify-between p-4 hover:bg-[#221F45] transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#F97316] flex items-center justify-center shrink-0">
                <Bell className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-black text-white">Notifications</p>
                <p className="text-xs font-medium text-gray-400">Alerts and messages</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-500" />
          </Link>
        </div>
      </div>

      {/* ── 5. GROUPED SECTION 2: HELP & SETTINGS (Exact Replica of Screenshot 2) ── */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center gap-2 px-1">
          <div className="w-1 h-4 bg-[#9FEF00] rounded-full" />
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">HELP & SETTINGS</h2>
        </div>

        <div className="bg-[#1C1936] border border-[#2A264F] rounded-3xl overflow-hidden divide-y divide-[#262247]">
          
          {/* Settings */}
          <button 
            onClick={() => toast.info("Settings modal")}
            className="w-full flex items-center justify-between p-4 hover:bg-[#221F45] transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#475569] flex items-center justify-center shrink-0">
                <Settings className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-black text-white">Settings</p>
                <p className="text-xs font-medium text-gray-400">Theme, profile & alerts</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-500" />
          </button>

          {/* Admin Portal */}
          <Link 
            to="/admin"
            className="flex items-center justify-between p-4 hover:bg-[#221F45] transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#F5C400] flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5 text-black" />
              </div>
              <div>
                <p className="text-sm font-black text-white">Admin Console & Operations</p>
                <p className="text-xs font-medium text-gray-400">Sports API, users, matches & metrics</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-[#F5C400]/20 text-[#F5C400] text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                ADMIN
              </span>
              <ChevronRight className="h-5 w-5 text-gray-500" />
            </div>
          </Link>

          {/* Help & Support */}
          <Link 
            to="/partners"
            className="flex items-center justify-between p-4 hover:bg-[#221F45] transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#06B6D4] flex items-center justify-center shrink-0">
                <HelpCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-black text-white">Help & Support</p>
                <p className="text-xs font-medium text-gray-400">24/7 customer service</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-[#154D58] text-[#22D3EE] text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                24/7
              </span>
              <ChevronRight className="h-5 w-5 text-gray-500" />
            </div>
          </Link>

          {/* Live Chat */}
          <button 
            onClick={() => toast.success("Connected to 24/7 Agent Live Chat!")}
            className="w-full flex items-center justify-between p-4 hover:bg-[#221F45] transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#10B981] flex items-center justify-center shrink-0">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-black text-white">Live Chat</p>
                <p className="text-xs font-medium text-gray-400">Talk to an agent now</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-[#064E3B] text-[#34D399] text-[10px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#34D399] animate-pulse" /> ONLINE
              </span>
              <ChevronRight className="h-5 w-5 text-gray-500" />
            </div>
          </button>

          {/* Responsible Gaming */}
          <Link 
            to="/partners"
            className="flex items-center justify-between p-4 hover:bg-[#221F45] transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#EF4444] flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-black text-white">Responsible Gaming</p>
                <p className="text-xs font-medium text-gray-400">Limits, self-exclusion & tools</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-500" />
          </Link>

          {/* Terms & Conditions */}
          <Link 
            to="/partners"
            className="flex items-center justify-between p-4 hover:bg-[#221F45] transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#64748B] flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-black text-white">Terms & Conditions</p>
                <p className="text-xs font-medium text-gray-400">Rules, payouts & legal</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-500" />
          </Link>
        </div>
      </div>

      {/* ── 6. SIGN OUT BUTTON CARD (Exact Replica of Screenshot 2) ── */}
      <button 
        onClick={handleSignOut}
        className="w-full bg-[#1C1936] border border-[#E41B23]/40 rounded-3xl p-4 flex items-center justify-between hover:bg-[#241d3d] transition-all text-left shadow-lg group"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-[#EF4444] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <LogOut className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-[#EF4444]">Sign Out</p>
            <p className="text-xs font-medium text-gray-400">End your session securely</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-[#EF4444]" />
      </button>

      {/* ── 7. FOOTER INFORMATION (Exact Replica of Screenshot 2) ── */}
      <div className="text-center space-y-2 pt-4 pb-6">
        <div className="flex justify-center">
          <BetrixLogo />
        </div>
        <p className="text-[11px] font-medium text-gray-400 max-w-xs mx-auto leading-relaxed">
          Licensed & regulated by the Gaming Commission of Ghana · Licence No. GCG/CAS/0265
        </p>
      </div>

    </div>
  );
}
