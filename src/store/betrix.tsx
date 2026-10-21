import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { matchById, teamById, isMatchLocked, type Match } from "@/data/football";
import { fetchLiveSportsFixtures, dynamicTeams } from "@/services/sportsApi";
import { formatClockGhana, espnDateParam } from "@/lib/ghana-time";
import { toast } from "sonner";
import {
  type AdminLeague,
  type AdminMatch,
  convertAdminMatchToMatch,
} from "@/data/adminMatches";
import {
  syncDepositToBackend,
  syncSlipToBackend,
  syncPartnerToBackend,
  syncPartnerDepositToBackend,
  syncWithdrawalToBackend,
  syncSlipSettlementToBackend,
  syncAdminLeagueToBackend,
  deleteAdminLeagueFromBackend,
  syncAdminMatchToBackend,
  deleteAdminMatchFromBackend,
  fetchBackendInitialData,
  syncUserProfileBalance,
  fetchUserProfileFromBackend,
  fetchUserDataFromBackend,
} from "@/services/backendSync";


export type { AdminLeague, AdminMatch };
export { isMatchLocked };

export interface Selection {
  matchId: string;
  marketId: string;
  marketName: string;
  optionId: string;
  optionLabel: string;
  multiplier: number;
  matchTitle?: string;
  kickoffTime?: string;
}

export interface HistoryEntry {
  code: string;
  createdAt: string;
  stake: number;
  selections: Selection[];
  status: "PENDING" | "WON" | "LOST";
  payout: number;
  potWin?: number;
  isLive?: boolean;
  matchTitle?: string;
  cashoutAvailable?: boolean;
  cashoutValue?: number;
  autoCashoutThreshold?: number;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  kind: "result" | "match" | "code" | "system";
}

export interface Profile {
  phone: string;
  userId: string;
  verified: boolean;
  tier: string;
  memberSince: string;
  status: string;
  nextUpdateDate: string;
}

export interface TransactionRecord {
  id: string;
  type: "DEPOSIT" | "WITHDRAWAL" | "STAKE" | "PAYOUT";
  amount: number;
  method?: string;
  reference?: string;
  createdAt: string;
}

import { seedPartners, seedPartnerDeposits, type PartnerRecord, type PartnerDepositRecord } from "@/data/admin";

export interface DailyRevenueEntry {
  date: string; // "YYYY-MM-DD"
  totalRevenue: number;
  transactionsCount: number;
}

interface BetrixState {
  profile: Profile;
  points: number; // alias for balance for backwards compatibility
  balance: number; // Real Cedis (GHS) balance
  transactions: TransactionRecord[];
  partnersList: PartnerRecord[];
  updatePartnerCommission: (partnerId: string, newRate: number) => void;
  registerPartner: (data: {
    name: string;
    email: string;
    phone: string;
    channel: string;
    channelLink?: string | undefined;
    audienceSize?: string | undefined;
    preferredCode?: string | undefined;
    notes?: string | undefined;
  }) => PartnerRecord;
  approvePartner: (partnerId: string, commissionRate?: number) => void;
  rejectPartner: (partnerId: string, reason?: string) => void;
  partnerDeposits: PartnerDepositRecord[];
  recordPartnerDeposit: (partnerCodeOrId: string, amount: number, userPhone?: string) => void;
  simulateUserDepositForPartner: (partnerId: string, amount: number) => void;
  referredByPartner: string | null;
  setReferredByPartner: (code: string | null) => void;
  totalRevenue: number;
  todayRevenue: number;
  devCommission: number;
  dailyRevenueLedger: Record<string, DailyRevenueEntry>;
  getRevenueForDate: (dateStr: string) => DailyRevenueEntry;
  simulateDeposit: (amount: number, dateStr?: string) => void;
  resetAllStatsToZero: () => void;
  loadScreenshotStats: () => void;
  totalPartnersCount: number;
  totalUsersCount: number;
  activeAnalysesCount: number;
  pendingPaymentsCount: number;
  clearAllOpenBets: () => void;
  loadDemoOngoingBets: () => void;
  toggleCashoutAvailable: (code: string) => void;
  slip: Selection[];
  history: HistoryEntry[];
  notifications: AppNotification[];
  isLoggedIn: boolean;
  login: (phone?: string, referralCode?: string, profileData?: any) => void;
  logout: () => void;

  toggleSelection: (s: Selection) => void;
  isSelected: (matchId: string, marketId: string, optionId: string) => boolean;
  removeSelection: (matchId: string, marketId: string) => void;
  clearSlip: () => void;
  loadSlip: (selections: Selection[]) => void;
  confirmSlip: (stake: number) => HistoryEntry;
  settleBet: (code: string, outcome?: "WON" | "LOST") => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  totalMultiplier: number;
  deposit: (amount: number, method?: string, reference?: string) => void;
  withdraw: (amount: number, method?: string, accountDetails?: string) => boolean;
  // Sports API fields
  apiMatches: Match[];
  allMatches: Match[];
  isApiLoading: boolean;
  apiError: string | null;
  lastApiUpdate: string | null;
  apiLiveCount: number;
  apiSourcesFetched: number;
  enableLiveApi: boolean;
  setEnableLiveApi: (enabled: boolean) => void;
  fetchApiMatches: () => Promise<void>;
  // Admin Match & League manager
  adminLeagues: AdminLeague[];
  adminMatches: AdminMatch[];
  addAdminLeague: (l: AdminLeague) => void;
  deleteAdminLeague: (id: string) => void;
  addAdminMatch: (m: AdminMatch) => void;
  deleteAdminMatch: (id: string) => void;
  updateAdminMatch: (m: Partial<AdminMatch> & { id: string }) => void;
}

const Ctx = createContext<BetrixState | null>(null);
const STORAGE_KEY = "betrix.state.v7";

const seedNotifications: AppNotification[] = [];

function seedHistory(): HistoryEntry[] {
  return [];
}

export function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < 5; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `BTX-${out}`;
}

export function BetrixProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState(0.00);
  const [phone, setPhone] = useState("");
  const [partnersList, setPartnersList] = useState<PartnerRecord[]>([]);
  const [partnerDeposits, setPartnerDeposits] = useState<PartnerDepositRecord[]>([]);
  const [referredByPartner, setReferredByPartner] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [slip, setSlip] = useState<Selection[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {

    if (typeof window === "undefined") return false;
    try {
      const raw = localStorage.getItem("betrix.state.v7");
      if (raw) {
        const p = JSON.parse(raw);
        return Boolean(p.isLoggedIn && p.phone && p.phone.trim().length > 0);
      }
    } catch {}
    return false;
  });

  const [profileData, setProfileData] = useState<Profile>(() => ({
    phone: "",
    userId: "6939B805",
    verified: true,
    tier: "BRONZE I",
    memberSince: new Date().getFullYear().toString(),
    status: "Active",
    nextUpdateDate: "Next Month",
  }));


  // Admin Match & League Management
  const [adminLeagues, setAdminLeagues] = useState<AdminLeague[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("betrix.admin_leagues.v1");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: "l_ghana_premier",
        name: "Ghana Premier League",
        country: "Ghana",
        color: "#F5C400",
        logoUrl: "https://upload.wikimedia.org/wikipedia/en/thumb/f/fa/Ghana_Premier_League.svg/330px-Ghana_Premier_League.svg.png",
        createdAt: new Date().toISOString(),
      },
    ];
  });

  const [adminMatches, setAdminMatches] = useState<AdminMatch[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("betrix.admin_matches.v1");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem("betrix.admin_leagues.v1", JSON.stringify(adminLeagues));
    } catch {}
  }, [adminLeagues]);

  useEffect(() => {
    try {
      localStorage.setItem("betrix.admin_matches.v1", JSON.stringify(adminMatches));
    } catch {}
  }, [adminMatches]);

  const addAdminLeague = useCallback((l: AdminLeague) => {
    setAdminLeagues((prev) => [...prev.filter((x) => x.id !== l.id), l]);
    syncAdminLeagueToBackend(l);
  }, []);

  const deleteAdminLeague = useCallback((id: string) => {
    setAdminLeagues((prev) => prev.filter((x) => x.id !== id));
    deleteAdminLeagueFromBackend(id);
  }, []);

  const addAdminMatch = useCallback((m: AdminMatch) => {
    setAdminMatches((prev) => [...prev.filter((x) => x.id !== m.id), m]);
    syncAdminMatchToBackend(m);
  }, []);

  const deleteAdminMatch = useCallback((id: string) => {
    setAdminMatches((prev) => prev.filter((x) => x.id !== id));
    deleteAdminMatchFromBackend(id);
  }, []);

  const updateAdminMatch = useCallback((m: Partial<AdminMatch> & { id: string }) => {
    setAdminMatches((prev) => {
      const updated = prev.map((item) => (item.id === m.id ? { ...item, ...m } : item));
      const full = updated.find((item) => item.id === m.id);
      if (full) syncAdminMatchToBackend(full);
      return updated;
    });
  }, []);

  // Periodic real-time tick to update live match clocks and score transitions every 15s
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => (t + 1) % 1000000);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Sports API State Logic
  const [apiMatches, setApiMatches] = useState<Match[]>([]);
  const [isApiLoading, setIsApiLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastApiUpdate, setLastApiUpdate] = useState<string | null>(null);
  const [apiLiveCount, setApiLiveCount] = useState<number>(0);
  const [apiSourcesFetched, setApiSourcesFetched] = useState<number>(0);
  const [enableLiveApi, setEnableLiveApi] = useState<boolean>(true);

  const fetchApiMatches = useCallback(async () => {
    if (!enableLiveApi) return;
    setIsApiLoading(true);
    setApiError(null);
    try {
      const todayParam = espnDateParam(0);
      const res = await fetchLiveSportsFixtures(undefined, todayParam);
      setApiMatches(res.matches);
      setApiLiveCount(res.liveCount);
      setApiSourcesFetched(res.sourcesFetched);
      setLastApiUpdate(formatClockGhana(new Date()));
    } catch (e: any) {
      setApiError(e?.message || "Failed to load live sports fixtures");
    } finally {
      setIsApiLoading(false);
    }
  }, [enableLiveApi]);

  useEffect(() => {
    fetchApiMatches();
    const interval = setInterval(() => {
      fetchApiMatches();
    }, 25000);
    return () => clearInterval(interval);
  }, [fetchApiMatches]);

  const allMatches = useMemo(() => {
    const convertedAdmin = adminMatches.map((am) =>
      convertAdminMatchToMatch(am, adminLeagues)
    );
    const adminIds = new Set(convertedAdmin.map((m) => m.id));
    const nonAdminApi = apiMatches.filter((m) => !adminIds.has(m.id));

    const combined = [...convertedAdmin, ...nonAdminApi];
    const seenIds = new Set<string>();
    const seenPairs = new Set<string>();
    const deduplicated: Match[] = [];

    for (const m of combined) {
      if (seenIds.has(m.id)) continue;
      seenIds.add(m.id);

      const hName = (teamById(m.homeId)?.name || dynamicTeams.get(m.homeId)?.name || m.homeId).toLowerCase().replace(/[^a-z0-9]/g, "");
      const aName = (teamById(m.awayId)?.name || dynamicTeams.get(m.awayId)?.name || m.awayId).toLowerCase().replace(/[^a-z0-9]/g, "");
      const pairKey = `${hName}___${aName}`;
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);

      deduplicated.push(m);
    }

    return deduplicated.sort((a, b) => {
      // LIVE first, sorted by minute descending (furthest into game first)
      if (a.status === "LIVE" && b.status !== "LIVE") return -1;
      if (b.status === "LIVE" && a.status !== "LIVE") return 1;
      if (a.status === "LIVE" && b.status === "LIVE") return (b.minute ?? 0) - (a.minute ?? 0);
      // FINISHED last
      if (a.status === "FINISHED" && b.status !== "FINISHED") return 1;
      if (b.status === "FINISHED" && a.status !== "FINISHED") return -1;
      // SCHEDULED: ascending kickoff time (earliest first)
      return a.kickoff.localeCompare(b.kickoff);
    });
  }, [adminMatches, adminLeagues, apiMatches, enableLiveApi, tick]);

  // Daily revenue ledger mapping dateStr (YYYY-MM-DD) to DailyRevenueEntry
  const [dailyRevenueLedger, setDailyRevenueLedger] = useState<Record<string, DailyRevenueEntry>>({});

  useEffect(() => {
    // 1. Initial hydration from client cache for instant responsiveness
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.balance === "number") setBalance(parsed.balance);
        if (typeof parsed.phone === "string") setPhone(parsed.phone);
        if (Array.isArray(parsed.transactions)) setTransactions(parsed.transactions);
        if (Array.isArray(parsed.partnersList)) {
          const migrated = parsed.partnersList.map((p: any) => ({
            ...p,
            status: p.status || "APPROVED",
          }));
          setPartnersList(migrated);
        }
        if (Array.isArray(parsed.partnerDeposits)) setPartnerDeposits(parsed.partnerDeposits);
        if (typeof parsed.referredByPartner === "string") setReferredByPartner(parsed.referredByPartner);
        if (Array.isArray(parsed.slip)) setSlip(parsed.slip);
        if (Array.isArray(parsed.history)) setHistory(parsed.history);
        if (Array.isArray(parsed.notifications)) setNotifications(parsed.notifications);
        if (typeof parsed.isLoggedIn === "boolean") setIsLoggedIn(parsed.isLoggedIn);
        if (parsed.dailyRevenueLedger) setDailyRevenueLedger(parsed.dailyRevenueLedger);

        if (parsed.phone && typeof parsed.phone === "string" && parsed.phone.trim().length > 0) {
          fetchUserProfileFromBackend(parsed.phone).then((uProf) => {
            if (uProf) {
              setBalance(uProf.balance);
              setProfileData((prev) => ({
                ...prev,
                ...uProf,
              }));
            }
          });
          fetchUserDataFromBackend(parsed.phone).then((uData) => {
            if (uData) {
              if (uData.transactions && uData.transactions.length > 0) setTransactions(uData.transactions);
              if (uData.slips && uData.slips.length > 0) setHistory(uData.slips);
            }
          });
        }
      }
    } catch {
      /* ignore corrupted local state */
    }

    // 2. Fetch authoritative live data directly from the Supabase backend
    fetchBackendInitialData().then((remote) => {
      if (remote) {
        if (remote.partners && remote.partners.length > 0) {
          setPartnersList(remote.partners);
        }
        if (remote.partnerDeposits && remote.partnerDeposits.length > 0) {
          setPartnerDeposits(remote.partnerDeposits);
        }
        if (remote.adminLeagues && remote.adminLeagues.length > 0) {
          setAdminLeagues(remote.adminLeagues);
        }
        if (remote.adminMatches && remote.adminMatches.length > 0) {
          setAdminMatches(remote.adminMatches);
        }
      }
    });
  }, []);



  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          balance,
          phone,
          transactions,
          partnersList,
          partnerDeposits,
          referredByPartner,
          slip,
          history,
          notifications,
          isLoggedIn,
          dailyRevenueLedger,
        })
      );
    } catch {
      /* storage unavailable */
    }
  }, [
    balance,
    phone,
    transactions,
    partnersList,
    partnerDeposits,
    referredByPartner,
    slip,
    history,
    notifications,
    isLoggedIn,
    dailyRevenueLedger,
  ]);

  const updatePartnerCommission = useCallback((partnerId: string, newRate: number) => {
    setPartnersList((prev) => {
      const updated = prev.map((p) => {
        if (p.id === partnerId) {
          const u = { ...p, commissionRate: Math.max(0, Math.min(100, newRate)) };
          syncPartnerToBackend(u);
          return u;
        }
        return p;
      });
      return updated;
    });
  }, []);

  const registerPartner = useCallback(
    (data: {
      name: string;
      email: string;
      phone: string;
      channel: string;
      channelLink?: string | undefined;
      audienceSize?: string | undefined;
      preferredCode?: string | undefined;
      notes?: string | undefined;
    }) => {
      let code = data.preferredCode?.trim().toUpperCase();
      if (!code) {
        code = makeCode();
      } else if (!code.startsWith("BTX-")) {
        code = `BTX-${code.replace(/[^A-Z0-9]/g, "")}`;
      }

      const newPartner: PartnerRecord = {
        id: `p-${Date.now()}`,
        name: data.name.trim(),
        code,
        signups: 0,
        activeUsers: 0,
        slipsDriven: 0,
        totalDeposits: 0,
        commissionRate: 10,
        tier: "Bronze",
        status: "PENDING",
        email: data.email.trim(),
        phone: data.phone.trim(),
        channel: data.channel.trim(),
        channelLink: data.channelLink ? data.channelLink.trim() : undefined,
        audienceSize: data.audienceSize ? data.audienceSize.trim() : undefined,
        appliedAt: "Just now",
        notes: data.notes ? data.notes.trim() : undefined,
      };

      setPartnersList((prev) => [newPartner, ...prev]);
      syncPartnerToBackend(newPartner);

      setNotifications((prev) => [
        {
          id: `NOTIF-PARTNER-${Date.now()}`,
          title: "New Partner Application",
          body: `${data.name} applied for partnership (${code}). Pending admin approval.`,
          time: "just now",
          read: false,
          kind: "system",
        },
        ...prev,
      ]);

      return newPartner;
    },
    []
  );

  const approvePartner = useCallback((partnerId: string, commissionRate?: number) => {
    setPartnersList((prev) =>
      prev.map((p) => {
        if (p.id === partnerId) {
          const updated = {
            ...p,
            status: "APPROVED" as const,
            commissionRate: typeof commissionRate === "number" ? commissionRate : p.commissionRate,
          };
          syncPartnerToBackend(updated);
          return updated;
        }
        return p;
      })
    );

    setNotifications((prev) => [
      {
        id: `NOTIF-APPR-${Date.now()}`,
        title: "Partner Application Approved",
        body: `Partner application approved! Their referral link is now active.`,
        time: "just now",
        read: false,
        kind: "system",
      },
      ...prev,
    ]);
  }, []);

  const rejectPartner = useCallback((partnerId: string, reason?: string) => {
    setPartnersList((prev) =>
      prev.map((p) => {
        if (p.id === partnerId) {
          const updated: PartnerRecord = {
            ...p,
            status: "REJECTED",
            notes: reason !== undefined ? reason : p.notes,
          };
          syncPartnerToBackend(updated);
          return updated;
        }
        return p;
      })
    );
  }, []);

  const recordPartnerDeposit = useCallback(
    (partnerCodeOrId: string, amount: number, userPhone?: string) => {
      setPartnersList((prev) =>
        prev.map((p) => {
          if (p.id === partnerCodeOrId || p.code.toUpperCase() === partnerCodeOrId.toUpperCase()) {
            const updated = {
              ...p,
              totalDeposits: p.totalDeposits + amount,
              activeUsers: p.activeUsers + 1,
              signups: Math.max(p.signups, p.activeUsers + 1),
            };
            syncPartnerToBackend(updated);
            return updated;
          }
          return p;
        })
      );

      const target = partnersList.find(
        (p) => p.id === partnerCodeOrId || p.code.toUpperCase() === partnerCodeOrId.toUpperCase()
      );
      const rate = target ? target.commissionRate : 12;
      const cut = amount * (rate / 100);
      const masked = userPhone
        ? `${userPhone.slice(0, 3)}***${userPhone.slice(-4)}`
        : `024***${Math.floor(1000 + Math.random() * 9000)}`;

      const newDep: PartnerDepositRecord = {
        id: `dep-${Date.now()}`,
        partnerId: target?.id || "p1",
        partnerCode: target?.code || partnerCodeOrId,
        userPhone: masked,
        amount,
        commissionEarned: cut,
        date: "Just now",
        status: "Completed",
        createdAt: new Date().toISOString(),
      };

      setPartnerDeposits((prev) => [newDep, ...prev]);
      syncPartnerDepositToBackend(newDep);
    },
    [partnersList]
  );

  const simulateUserDepositForPartner = useCallback(
    (partnerId: string, amount: number) => {
      const target = partnersList.find((p) => p.id === partnerId);
      if (!target) return;
      const userPhone = `024***${Math.floor(1000 + Math.random() * 9000)}`;
      const cut = amount * (target.commissionRate / 100);

      setPartnersList((prev) =>
        prev.map((p) => {
          if (p.id === partnerId) {
            return {
              ...p,
              totalDeposits: p.totalDeposits + amount,
              activeUsers: p.activeUsers + 1,
              signups: Math.max(p.signups, p.activeUsers + 1),
            };
          }
          return p;
        })
      );

      const newDep: PartnerDepositRecord = {
        id: `dep-sim-${Date.now()}`,
        partnerId: target.id,
        partnerCode: target.code,
        userPhone,
        amount,
        commissionEarned: cut,
        date: "Just now",
        status: "Completed",
      };
      setPartnerDeposits((prev) => [newDep, ...prev]);
      syncPartnerDepositToBackend(newDep);

      setNotifications((prev) => [
        {
          id: `NOTIF-PDEP-${Date.now()}`,
          title: "Referred User Deposited",
          body: `Referred user ${userPhone} deposited GHS ${amount.toFixed(2)} via ${target.code}. +GHS ${cut.toFixed(2)} commission earned!`,
          time: "just now",
          read: false,
          kind: "system",
        },
        ...prev,
      ]);
    },
    [partnersList]
  );

  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const todayRevenue = useMemo(() => {
    return transactions
      .filter((t) => t.type === "DEPOSIT" && t.createdAt.slice(0, 10) === todayISO)
      .reduce((acc, cur) => acc + cur.amount, 0);
  }, [transactions, todayISO]);

  const totalRevenue = useMemo(() => {
    return transactions
      .filter((t) => t.type === "DEPOSIT")
      .reduce((acc, cur) => acc + cur.amount, 0);
  }, [transactions]);

  const devCommission = Number((todayRevenue * 0.20).toFixed(2));

  const totalPartnersCount = partnersList.filter((p) => p.status === "APPROVED").length;
  const totalUsersCount = partnersList.reduce((acc, p) => acc + (p.activeUsers || 0), 0) + (isLoggedIn ? 1 : 0);
  const activeAnalysesCount = history.filter((h) => h.status === "PENDING").length;
  const pendingPaymentsCount = partnersList.filter((p) => p.status === "PENDING").length;

  const getRevenueForDate = useCallback(
    (dateStr: string): DailyRevenueEntry => {
      const dayTxs = transactions.filter(
        (t) => t.type === "DEPOSIT" && t.createdAt.slice(0, 10) === dateStr
      );
      return {
        date: dateStr,
        totalRevenue: dayTxs.reduce((acc, cur) => acc + cur.amount, 0),
        transactionsCount: dayTxs.length,
      };
    },
    [transactions]
  );

  const simulateDeposit = useCallback(
    (amount: number, dateStr?: string) => {
      const targetDate = dateStr || new Date().toISOString().slice(0, 10);
      const newTx: TransactionRecord = {
        id: `TX-DEP-${Date.now()}`,
        type: "DEPOSIT",
        amount,
        method: "Live Gateway",
        reference: `REF-${Math.floor(100000 + Math.random() * 900000)}`,
        createdAt: targetDate === new Date().toISOString().slice(0, 10) ? new Date().toISOString() : `${targetDate}T12:00:00.000Z`,
      };
      setTransactions((prev) => [newTx, ...prev]);
      syncDepositToBackend(newTx, phone);
    },
    [phone]
  );

  const resetAllStatsToZero = useCallback(() => {
    setDailyRevenueLedger({});
    setPartnerDeposits([]);
    setTransactions([]);
  }, []);

  const loadScreenshotStats = useCallback(() => {
    fetchBackendInitialData().then((remote) => {
      if (remote) {
        if (remote.transactions) setTransactions(remote.transactions);
        if (remote.slips) setHistory(remote.slips);
        if (remote.partners) setPartnersList(remote.partners);
        if (remote.partnerDeposits) setPartnerDeposits(remote.partnerDeposits);
      }
    });
  }, []);

  const clearAllOpenBets = useCallback(() => {
    setHistory((prev) => prev.filter((h) => h.status !== "PENDING"));
  }, []);

  const loadDemoOngoingBets = useCallback(() => {
    fetchBackendInitialData().then((remote) => {
      if (remote?.slips) {
        setHistory(remote.slips);
      }
    });
  }, []);

  const toggleCashoutAvailable = useCallback((code: string) => {
    setHistory((prev) =>
      prev.map((h) => (h.code === code ? { ...h, cashoutAvailable: !h.cashoutAvailable } : h))
    );
  }, []);

  const login = useCallback((userPhone?: string, referralCode?: string, extraProfile?: any) => {
    setIsLoggedIn(true);
    if (userPhone && userPhone.trim().length > 0) {
      const p = userPhone.trim();
      setPhone(p);
      if (extraProfile) {
        setProfileData((prev) => ({
          ...prev,
          phone: p,
          userId: extraProfile.userId || prev.userId,
          tier: extraProfile.tier || prev.tier,
          memberSince: extraProfile.memberSince || prev.memberSince,
        }));
        if (typeof extraProfile.balance === "number") {
          setBalance(extraProfile.balance);
        }
      }
      // Load user transactions and slips from Supabase
      fetchUserDataFromBackend(p).then((res) => {
        if (res) {
          if (res.transactions && res.transactions.length > 0) setTransactions(res.transactions);
          if (res.slips && res.slips.length > 0) setHistory(res.slips);
        }
      });
    }
    if (referralCode && referralCode.trim().length > 0) {
      const code = referralCode.trim().toUpperCase();
      setReferredByPartner(code);
      setPartnersList((prev) =>
        prev.map((p) => {
          if (p.code.toUpperCase() === code) {
            const u = { ...p, signups: p.signups + 1 };
            syncPartnerToBackend(u);
            return u;
          }
          return p;
        })
      );
    }
  }, []);

  const logout = useCallback(() => {
    setIsLoggedIn(false);
    setPhone("");
    setBalance(0);
    setSlip([]);
    setTransactions([]);
    setHistory([]);
  }, []);


  const toggleSelection = useCallback((s: Selection) => {
    // Check if match has started or finished — lock betting
    const targetMatch = allMatches.find((m) => m.id === s.matchId) || matchById(s.matchId);
    if (targetMatch && isMatchLocked(targetMatch)) {
      if (targetMatch.status === "FINISHED") {
        toast.error("This match has finished. Odds are locked and betting is closed.");
      } else {
        toast.error("This match has already kicked off. Odds are locked until the game ends.");
      }
      return;
    }

    setSlip((prev) => {
      const same = prev.find((p) => p.matchId === s.matchId && p.marketId === s.marketId);
      if (same && same.optionId === s.optionId) {
        return prev.filter((p) => !(p.matchId === s.matchId && p.marketId === s.marketId));
      }
      if (same) {
        return prev.map((p) => (p.matchId === s.matchId && p.marketId === s.marketId ? s : p));
      }
      return [...prev, s];
    });
  }, [allMatches]);

  const isSelected = useCallback(
    (matchId: string, marketId: string, optionId: string) =>
      slip.some((p) => p.matchId === matchId && p.marketId === marketId && p.optionId === optionId),
    [slip],
  );

  const removeSelection = useCallback((matchId: string, marketId: string) => {
    setSlip((prev) => prev.filter((p) => !(p.matchId === matchId && p.marketId === marketId)));
  }, []);

  const clearSlip = useCallback(() => setSlip([]), []);
  const loadSlip = useCallback((selections: Selection[]) => setSlip(selections), []);

  const totalMultiplier = useMemo(
    () => Number(slip.reduce((acc, s) => acc * s.multiplier, 1).toFixed(2)),
    [slip],
  );

  const confirmSlip = useCallback(
    (stake: number) => {
      // Validate that no started or finished matches are in the slip
      const lockedSelection = slip.find((s) => {
        const m = allMatches.find((x) => x.id === s.matchId) || matchById(s.matchId);
        return isMatchLocked(m);
      });
      if (lockedSelection) {
        const m = allMatches.find((x) => x.id === lockedSelection.matchId) || matchById(lockedSelection.matchId);
        if (m?.status === "FINISHED") {
          toast.error("Cannot place bet: One or more matches in your slip have finished and odds are locked.");
        } else {
          toast.error("Cannot place bet: One or more matches have already started. Odds are locked until the game ends.");
        }
        throw new Error("Match is locked");
      }

      const potWin = Number((stake * totalMultiplier).toFixed(2));
      const entry: HistoryEntry = {
        code: makeCode(),
        createdAt: new Date().toISOString(),
        stake,
        selections: slip,
        status: "PENDING",
        payout: 0,
        potWin,
        matchTitle: slip.length === 1 ? (slip[0]?.matchTitle || "Single Match") : `${slip.length} Selections Accumulator`,
      };
      setHistory((h) => [entry, ...h]);
      syncSlipToBackend(entry, phone);
      setBalance((p) => {
        const next = Math.max(0, Number((p - stake).toFixed(2)));
        syncUserProfileBalance(phone, next);
        return next;
      });
      const newStakeTx: TransactionRecord = {
        id: `TX-${entry.code}`,
        type: "STAKE",
        amount: stake,
        method: "Bet Stake",
        reference: entry.code,
        createdAt: new Date().toISOString(),
      };
      setTransactions((t) => [newStakeTx, ...t]);
      syncDepositToBackend(newStakeTx, phone);
      setSlip([]);
      setNotifications((n) => [
        { id: entry.code, title: "Bet placed (GHS)", body: `Slip ${entry.code} placed with GHS ${stake.toFixed(2)} stake. Potential Win: GHS ${potWin.toFixed(2)}.`, time: "just now", read: false, kind: "result" },
        ...n,
      ]);
      return entry;
    },
    [slip, allMatches, totalMultiplier, phone]
  );

  const markAllRead = useCallback(() => setNotifications((n) => n.map((x) => ({ ...x, read: true }))), []);
  const markRead = useCallback((id: string) => setNotifications((n) => n.map((x) => (x.id === id ? { ...x, read: true } : x))), []);

  const deposit = useCallback(
    (amount: number, method = "Mobile Money Gateway", reference?: string) => {
      const ref = reference || `PAY-GHS-${amount}-${Math.floor(1000 + Math.random() * 9000)}`;
      setBalance((prev) => {
        const next = Number((prev + amount).toFixed(2));
        syncUserProfileBalance(phone, next);
        return next;
      });
      const newDepTx: TransactionRecord = {
        id: `TX-DEP-${Date.now()}`,
        type: "DEPOSIT",
        amount,
        method,
        reference: ref,
        createdAt: new Date().toISOString(),
      };
      setTransactions((prev) => [newDepTx, ...prev]);
      syncDepositToBackend(newDepTx, phone);

      const today = new Date().toISOString().slice(0, 10);
      setDailyRevenueLedger((prev) => {
        const cur = prev[today] || { date: today, totalRevenue: 0, transactionsCount: 0 };
        return {
          ...prev,
          [today]: {
            date: today,
            totalRevenue: cur.totalRevenue + amount,
            transactionsCount: cur.transactionsCount + 1,
          },
        };
      });

      // If user signed up or is tied to a partner referral link, credit the partner!
      if (referredByPartner) {
        recordPartnerDeposit(referredByPartner, amount, phone);
      }

      setNotifications((prev) => [
        {
          id: `NOTIF-DEP-${Date.now()}`,
          title: "Deposit Successful",
          body: `GHS ${amount.toFixed(2)} has been credited to your balance via ${method}. Ref: ${ref}`,
          time: "just now",
          read: false,
          kind: "system",
        },
        ...prev,
      ]);
    },
    [referredByPartner, phone, recordPartnerDeposit]
  );

  const withdraw = useCallback((amount: number, method = "Mobile Money", accountDetails?: string) => {
    let success = false;
    setBalance((prev) => {
      if (prev < amount) {
        success = false;
        return prev;
      }
      success = true;
      const next = Number((prev - amount).toFixed(2));
      syncUserProfileBalance(phone, next);
      return next;
    });
    const ref = `WTH-GHS-${amount}-${Math.floor(1000 + Math.random() * 9000)}`;
    const wthTx: TransactionRecord = {
      id: `TX-WTH-${Date.now()}`,
      type: "WITHDRAWAL",
      amount,
      method: `${method} (${accountDetails || "MoMo"})`,
      reference: ref,
      createdAt: new Date().toISOString(),
    };
    setTransactions((prev) => [wthTx, ...prev]);
    syncWithdrawalToBackend(wthTx, phone);
    setNotifications((prev) => [
      {
        id: `NOTIF-WTH-${Date.now()}`,
        title: "Withdrawal Sent",
        body: `GHS ${amount.toFixed(2)} requested via ${method}. Ref: ${ref}`,
        time: "just now",
        read: false,
        kind: "system",
      },
      ...prev,
    ]);
    return success;
  }, [phone]);

  const settleBet = useCallback((code: string, outcome: "WON" | "LOST" = "WON") => {
    setHistory((prev) => {
      return prev.map((entry) => {
        if (entry.code !== code || entry.status !== "PENDING") return entry;
        const potWin = entry.potWin ?? Number((entry.stake * entry.selections.reduce((acc, s) => acc * s.multiplier, 1)).toFixed(2));
        if (outcome === "WON") {
          const settledEntry = { ...entry, status: "WON" as const, payout: potWin };
          syncSlipSettlementToBackend(settledEntry, phone);
          setBalance((prevBal) => {
            const next = Number((prevBal + potWin).toFixed(2));
            syncUserProfileBalance(phone, next);
            return next;
          });

          const payoutTx: TransactionRecord = {
            id: `TX-WIN-${entry.code}-${Date.now()}`,
            type: "PAYOUT",
            amount: potWin,
            method: "Winning Bet Payout",
            reference: entry.code,
            createdAt: new Date().toISOString(),
          };
          setTransactions((t) => [payoutTx, ...t]);
          syncDepositToBackend(payoutTx, phone);
          setNotifications((n) => [
            {
              id: `NOTIF-WIN-${entry.code}-${Date.now()}`,
              title: "🎉 You Won!",
              body: `Slip ${entry.code} won as predicted! GHS ${potWin.toFixed(2)} has been added to your balance.`,
              time: "just now",
              read: false,
              kind: "result" as const,
            },
            ...n,
          ]);
          toast.success(`🎉 Bet Won! GHS ${potWin.toFixed(2)} credited to your account!`, { duration: 6000 });
          return settledEntry;
        } else {
          const settledEntry = { ...entry, status: "LOST" as const, payout: 0 };
          syncSlipSettlementToBackend(settledEntry, phone);
          toast.info(`Slip ${entry.code} settled as LOST.`);
          return settledEntry;
        }
      });
    });
  }, [phone]);

  // ── Auto-settle PENDING bets when all selections' matches finish ──
  useEffect(() => {
    setHistory((prevHistory) => {
      let changed = false;
      let totalCredited = 0;
      const winningEntries: { code: string; payout: number }[] = [];
      const settledEntries: HistoryEntry[] = [];

      const settled = prevHistory.map((entry) => {
        if (entry.status !== "PENDING") return entry;

        // Check if ALL selections in this slip have a finished match
        const allFinished = entry.selections.every((sel) => {
          const m = allMatches.find((x) => x.id === sel.matchId) || matchById(sel.matchId);
          return m && m.status === "FINISHED";
        });
        if (!allFinished) return entry;

        // Evaluate each selection against the final score
        const allWon = entry.selections.every((sel) => {
          const m = allMatches.find((x) => x.id === sel.matchId) || matchById(sel.matchId);
          if (!m) return false;
          return evaluateSelection(sel, m);
        });

        const potWin = entry.potWin ?? Number((entry.stake * entry.selections.reduce((acc, s) => acc * s.multiplier, 1)).toFixed(2));
        changed = true;
        if (allWon) {
          totalCredited += potWin;
          winningEntries.push({ code: entry.code, payout: potWin });
          const won = { ...entry, status: "WON" as const, payout: potWin };
          settledEntries.push(won);
          return won;
        } else {
          const lost = { ...entry, status: "LOST" as const, payout: 0 };
          settledEntries.push(lost);
          return lost;
        }
      });

      if (changed) {
        // Sync all settled slips to Supabase
        settledEntries.forEach((e) => syncSlipSettlementToBackend(e, phone));

        if (totalCredited > 0) {
          setBalance((prevBal) => {
            const next = Number((prevBal + totalCredited).toFixed(2));
            syncUserProfileBalance(phone, next);
            return next;
          });
          winningEntries.forEach(({ code, payout }) => {

            const payoutTx: TransactionRecord = {
              id: `TX-WIN-${code}-${Date.now()}`,
              type: "PAYOUT",
              amount: payout,
              method: "Winning Bet Payout",
              reference: code,
              createdAt: new Date().toISOString(),
            };
            setTransactions((t) => [payoutTx, ...t]);
            syncDepositToBackend(payoutTx, phone);
            setNotifications((n) => [
              {
                id: `NOTIF-WIN-${code}-${Date.now()}`,
                title: "🎉 You Won!",
                body: `Slip ${code} won! GHS ${payout.toFixed(2)} has been credited to your balance.`,
                time: "just now",
                read: false,
                kind: "result" as const,
              },
              ...n,
            ]);
          });
          toast.success(`🎉 Bet Won! GHS ${totalCredited.toFixed(2)} added to your balance!`, { duration: 6000 });
        }
        return settled;
      }
      return prevHistory;
    });
  }, [allMatches, tick, phone]);


  const value: BetrixState = {
    profile: {
      phone: phone || profileData.phone,
      userId: profileData.userId,
      verified: profileData.verified,
      tier: profileData.tier,
      memberSince: profileData.memberSince,
      status: profileData.status || "Active",
      nextUpdateDate: profileData.nextUpdateDate || "Next Month",
    },

    points: balance,
    balance,
    transactions,
    partnersList,
    updatePartnerCommission,
    registerPartner,
    approvePartner,
    rejectPartner,
    partnerDeposits,
    recordPartnerDeposit,
    simulateUserDepositForPartner,
    referredByPartner,
    setReferredByPartner,
    totalRevenue,
    todayRevenue,
    devCommission,
    dailyRevenueLedger,
    getRevenueForDate,
    simulateDeposit,
    resetAllStatsToZero,
    loadScreenshotStats,
    totalPartnersCount,
    totalUsersCount,
    activeAnalysesCount,
    pendingPaymentsCount,
    clearAllOpenBets,
    loadDemoOngoingBets,
    toggleCashoutAvailable,
    slip,
    history,
    notifications,
    isLoggedIn,
    login,
    logout,
    toggleSelection,
    isSelected,
    removeSelection,
    clearSlip,
    loadSlip,
    confirmSlip,
    settleBet,
    markAllRead,
    markRead,
    totalMultiplier,
    deposit,
    withdraw,
    // Sports API exports
    apiMatches,
    allMatches,
    isApiLoading,
    apiError,
    lastApiUpdate,
    apiLiveCount,
    apiSourcesFetched,
    enableLiveApi,
    setEnableLiveApi,
    fetchApiMatches,
    // Admin match manager
    adminLeagues,
    adminMatches,
    addAdminLeague,
    deleteAdminLeague,
    addAdminMatch,
    deleteAdminMatch,
    updateAdminMatch,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBetrix() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBetrix must be used inside BetrixProvider");
  return ctx;
}

export function selectionMatch(s: Selection): Match | undefined {
  return matchById(s.matchId);
}

/** Evaluates whether a user's selection won according to the finished match scores */
export function evaluateSelection(sel: Selection, m: Match): boolean {
  const h = m.homeScore ?? 0;
  const a = m.awayScore ?? 0;
  const optId = (sel.optionId || "").toLowerCase().trim();
  const label = (sel.optionLabel || "").toLowerCase().trim();
  const mktId = (sel.marketId || "").toLowerCase().trim();
  const mktName = (sel.marketName || "").toLowerCase().trim();

  // 1. Correct Score
  if (
    mktId === "cs" ||
    mktId === "m_correct_score" ||
    mktName.includes("correct score") ||
    optId.startsWith("cs-")
  ) {
    const cleanScore = label.replace(/[^\d:]/g, "") || optId.replace("cs-", "").trim();
    return cleanScore === `${h}:${a}`;
  }

  // 2. Both Teams To Score (BTTS)
  if (
    mktId === "btts" ||
    mktId === "m_btts" ||
    mktName.includes("both teams")
  ) {
    if (label === "yes" || optId.includes("yes")) return h > 0 && a > 0;
    if (label === "no" || optId.includes("no")) return h === 0 || a === 0;
  }

  // 3. Over / Under Goals
  if (
    mktId === "ou" ||
    mktId.includes("overunder") ||
    mktId.includes("o/u") ||
    mktName.includes("over") ||
    mktName.includes("under") ||
    mktName.includes("total goals") ||
    optId.includes("_o") ||
    optId.includes("_u") ||
    label.includes("over") ||
    label.includes("under")
  ) {
    const total = h + a;
    let threshold = 2.5;
    const thresholdMatch = (label + " " + mktId + " " + mktName).match(/(\d+\.\d+)/);
    if (thresholdMatch && thresholdMatch[1]) {
      threshold = parseFloat(thresholdMatch[1]);
    }
    if (label.includes("over") || optId.includes("over") || optId.includes("_o")) {
      return total > threshold;
    }
    if (label.includes("under") || optId.includes("under") || optId.includes("_u")) {
      return total < threshold;
    }
  }

  // 4. Double Chance
  if (
    mktId === "dc" ||
    mktId.includes("double_chance") ||
    mktName.includes("double chance") ||
    optId.includes("_1x") ||
    optId.includes("_x2") ||
    optId.includes("_12") ||
    label.includes(" or ")
  ) {
    if (optId.includes("1x") || label.includes("or draw") || label.includes("1x")) {
      return h >= a;
    }
    if (optId.includes("x2") || label.includes("draw or") || label.includes("x2")) {
      return a >= h;
    }
    if (optId.includes("12") || label.includes("12")) {
      return h !== a;
    }
  }

  // 5. Handicap
  if (mktId.includes("handicap") || mktId.includes("hcp") || mktName.includes("handicap")) {
    if (mktId.includes("02") || mktName.includes("0:2")) {
      if (optId.includes("home") || label.includes("(-2)")) return h - 2 > a;
      if (optId.includes("draw") || label.includes("0:2")) return h - 2 === a;
      if (optId.includes("away") || label.includes("(+2)")) return a + 2 > h;
    } else {
      if (optId.includes("home") || label.includes("(-1)")) return h - 1 > a;
      if (optId.includes("draw") || label.includes("0:1")) return h - 1 === a;
      if (optId.includes("away") || label.includes("(+1)")) return a + 1 > h;
    }
  }

  // 6. 1X2 / Match Result
  if (
    label === "1" ||
    label === "home" ||
    optId.endsWith("_1") ||
    optId === "opt_home" ||
    optId === "opt_1" ||
    optId === "home"
  ) {
    return h > a;
  }
  if (
    label === "x" ||
    label === "draw" ||
    optId.endsWith("_x") ||
    optId === "opt_draw" ||
    optId === "opt_x" ||
    optId === "draw"
  ) {
    return h === a;
  }
  if (
    label === "2" ||
    label === "away" ||
    optId.endsWith("_2") ||
    optId === "opt_away" ||
    optId === "opt_2" ||
    optId === "away"
  ) {
    return a > h;
  }

  return false;
}

export const formatPoints = (n: number) => `GHS ${n.toFixed(2)}`;
export const formatGHS = (n: number) => `GHS ${n.toFixed(2)}`;

