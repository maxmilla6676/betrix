import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { matchById, matches as seedMatches, type Match } from "@/data/football";
import { fetchLiveSportsFixtures } from "@/services/sportsApi";
import { formatClockGhana, espnDateParam } from "@/lib/ghana-time";
import {
  type AdminLeague,
  type AdminMatch,
  convertAdminMatchToMatch,
} from "@/data/adminMatches";

export type { AdminLeague, AdminMatch };

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
  login: (phone?: string, referralCode?: string) => void;
  logout: () => void;
  toggleSelection: (s: Selection) => void;
  isSelected: (matchId: string, marketId: string, optionId: string) => boolean;
  removeSelection: (matchId: string, marketId: string) => void;
  clearSlip: () => void;
  loadSlip: (selections: Selection[]) => void;
  confirmSlip: (stake: number) => HistoryEntry;
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

const seedNotifications: AppNotification[] = [
  { id: "n1", title: "Prediction result available", body: "Slip BTX-4M18T settled — 3 of 4 correct.", time: "12m ago", read: false, kind: "result" },
  { id: "n2", title: "Match starting soon", body: "Manchester City vs Tottenham kicks off in 30 minutes.", time: "48m ago", read: false, kind: "match" },
  { id: "n3", title: "Prediction code loaded", body: "You loaded code BTX-7K29Q with 3 selections.", time: "2h ago", read: true, kind: "code" },
  { id: "n4", title: "New platform announcement", body: "Champions League markets are now live on BETRIX.", time: "1d ago", read: true, kind: "system" },
];

function seedHistory(): HistoryEntry[] {
  const mk = (
    id: string,
    marketId: string,
    marketName: string,
    optionId: string,
    optionLabel: string,
    mult: number,
    matchTitle?: string,
    kickoffTime?: string
  ): Selection => ({
    matchId: id,
    marketId,
    marketName,
    optionId,
    optionLabel,
    multiplier: mult,
    matchTitle,
    kickoffTime,
  });

  return [
    {
      code: "BTX-ACC4",
      createdAt: new Date().toISOString(),
      stake: 10.00,
      potWin: 55.66,
      status: "PENDING",
      payout: 0,
      isLive: true,
      matchTitle: "Panathinaikos vs Asteras Tripolis",
      cashoutAvailable: true,
      cashoutValue: 10.00,
      selections: [
        mk("m-pana", "1x2-2up", "1X2 - 2UP", "home", "Home", 1.23, "Panathinaikos vs Asteras Tripolis", "18/10 14:30"),
        mk("m-lorient", "ou", "Monaco Over/Under", "o05", "Over 0.5", 1.23, "Lorient vs Monaco", "18/10 15:15"),
        mk("m-nott", "1x2-2up", "1X2 - 2UP", "away", "Away", 1.60, "Nottingham Forest vs Arsenal", "18/10 15:30"),
      ],
    },
    {
      code: "BTX-UD14",
      createdAt: new Date(Date.now() - 300000).toISOString(),
      stake: 14.00,
      potWin: 42.80,
      status: "PENDING",
      payout: 0,
      isLive: true,
      matchTitle: "Udinese vs Lecce",
      cashoutAvailable: false,
      cashoutValue: 23.00,
      selections: [
        mk("m-udi", "1x2", "Match Result", "home", "Home", 1.85, "Udinese vs Lecce", "18/10 13:30"),
        mk("m-emp", "ou", "Total Goals", "o15", "Over 1.5", 1.35, "Empoli vs Monza", "18/10 16:00"),
      ],
    },
    {
      code: "BTX-UD10",
      createdAt: new Date(Date.now() - 900000).toISOString(),
      stake: 10.00,
      potWin: 38.50,
      status: "PENDING",
      payout: 0,
      isLive: true,
      matchTitle: "Udinese vs Lecce",
      cashoutAvailable: false,
      cashoutValue: 16.50,
      selections: [
        mk("m-udi2", "1x2", "Match Result", "draw", "Draw", 3.20, "Udinese vs Lecce", "18/10 13:30"),
        mk("m-rom", "btts", "Both Teams To Score", "yes", "Yes", 1.70, "Roma vs Inter", "18/10 18:45"),
      ],
    },
    {
      code: "BTX-4M18T",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      stake: 50,
      potWin: 184,
      status: "WON",
      payout: 184,
      matchTitle: "Aston Villa vs Man City",
      selections: [mk("m19", "1x2", "Match Result", "home", "Home", 2.1, "Aston Villa vs Man City", "17/10 16:30")],
    },
  ];
}

export function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < 5; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `BTX-${out}`;
}

export function BetrixProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState(20.53); // Exact match to user reference screenshot
  const [phone, setPhone] = useState("0205795789");
  const [partnersList, setPartnersList] = useState<PartnerRecord[]>(seedPartners);
  const [partnerDeposits, setPartnerDeposits] = useState<PartnerDepositRecord[]>(seedPartnerDeposits);
  const [referredByPartner, setReferredByPartner] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [slip, setSlip] = useState<Selection[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>(seedHistory);
  const [notifications, setNotifications] = useState<AppNotification[]>(seedNotifications);
  const [isLoggedIn, setIsLoggedIn] = useState(true);

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
  }, []);

  const deleteAdminLeague = useCallback((id: string) => {
    setAdminLeagues((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const addAdminMatch = useCallback((m: AdminMatch) => {
    setAdminMatches((prev) => [...prev.filter((x) => x.id !== m.id), m]);
  }, []);

  const deleteAdminMatch = useCallback((id: string) => {
    setAdminMatches((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const updateAdminMatch = useCallback((m: Partial<AdminMatch> & { id: string }) => {
    setAdminMatches((prev) =>
      prev.map((item) => (item.id === m.id ? { ...item, ...m } : item))
    );
  }, []);

  // Periodic real-time tick to update live match clocks and score transitions every 15s
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => (t + 1) % 1000000);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Revenue & Stat overrides to match exact reference screenshot (GH₵214,600 Total, 8 Partners, 4198 Members, 616 Analyses, 6 Pending)
  const [totalRevenueOverride, setTotalRevenueOverride] = useState<number | null>(214600);
  const [partnersCountOverride, setPartnersCountOverride] = useState<number | null>(8);
  const [membersCountOverride, setMembersCountOverride] = useState<number | null>(4198);
  const [analysesCountOverride, setAnalysesCountOverride] = useState<number | null>(616);
  const [pendingCountOverride, setPendingCountOverride] = useState<number | null>(6);

  // Daily revenue ledger mapping dateStr (YYYY-MM-DD) to DailyRevenueEntry
  const [dailyRevenueLedger, setDailyRevenueLedger] = useState<Record<string, DailyRevenueEntry>>(() => {
    const map: Record<string, DailyRevenueEntry> = {};
    const now = new Date();
    // Default screenshot historical values:
    // WE 14 Oct: GH₵1,950
    // TH 15 Oct: GH₵5,100
    // FR 16 Oct: GH₵2,850
    // SA 17 Oct: GH₵0
    // TODAY 18 Oct: GH₵0
    const offsets = [
      { offset: 4, rev: 1950, count: 5 },
      { offset: 3, rev: 5100, count: 12 },
      { offset: 2, rev: 2850, count: 7 },
      { offset: 1, rev: 0, count: 0 },
      { offset: 0, rev: 0, count: 0 },
    ];
    offsets.forEach(({ offset, rev, count }) => {
      const d = new Date(now.getTime() - offset * 86400000);
      const iso = d.toISOString().slice(0, 10);
      map[iso] = { date: iso, totalRevenue: rev, transactionsCount: count };
    });
    return map;
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
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
      if (typeof parsed.totalRevenueOverride === "number") setTotalRevenueOverride(parsed.totalRevenueOverride);
      if (typeof parsed.partnersCountOverride === "number") setPartnersCountOverride(parsed.partnersCountOverride);
      if (typeof parsed.membersCountOverride === "number") setMembersCountOverride(parsed.membersCountOverride);
      if (typeof parsed.analysesCountOverride === "number") setAnalysesCountOverride(parsed.analysesCountOverride);
      if (typeof parsed.pendingCountOverride === "number") setPendingCountOverride(parsed.pendingCountOverride);
    } catch {
      /* ignore corrupted local state */
    }
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
          totalRevenueOverride,
          partnersCountOverride,
          membersCountOverride,
          analysesCountOverride,
          pendingCountOverride,
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
    totalRevenueOverride,
    partnersCountOverride,
    membersCountOverride,
    analysesCountOverride,
    pendingCountOverride,
  ]);

  const updatePartnerCommission = useCallback((partnerId: string, newRate: number) => {
    setPartnersList((prev) =>
      prev.map((p) => (p.id === partnerId ? { ...p, commissionRate: Math.max(0, Math.min(100, newRate)) } : p))
    );
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
          return {
            ...p,
            status: "APPROVED" as const,
            commissionRate: typeof commissionRate === "number" ? commissionRate : p.commissionRate,
          };
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
      };

      setPartnerDeposits((prev) => [newDep, ...prev]);
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
  const todayRevenue = dailyRevenueLedger[todayISO]?.totalRevenue || 0;
  const totalRevenue = totalRevenueOverride !== null
    ? totalRevenueOverride
    : Object.values(dailyRevenueLedger).reduce((acc, cur) => acc + cur.totalRevenue, 0);
  const devCommission = Number((todayRevenue * 0.30).toFixed(2));

  const totalPartnersCount = partnersCountOverride !== null
    ? partnersCountOverride
    : partnersList.filter((p) => p.status === "APPROVED").length;
  const totalUsersCount = membersCountOverride !== null ? membersCountOverride : 4198;
  const activeAnalysesCount = analysesCountOverride !== null ? analysesCountOverride : 616;
  const pendingPaymentsCount = pendingCountOverride !== null
    ? pendingCountOverride
    : partnersList.filter((p) => p.status === "PENDING").length;

  const getRevenueForDate = useCallback(
    (dateStr: string): DailyRevenueEntry => {
      if (dailyRevenueLedger[dateStr]) return dailyRevenueLedger[dateStr];
      return { date: dateStr, totalRevenue: 0, transactionsCount: 0 };
    },
    [dailyRevenueLedger]
  );

  const simulateDeposit = useCallback(
    (amount: number, dateStr?: string) => {
      const targetDate = dateStr || new Date().toISOString().slice(0, 10);
      setDailyRevenueLedger((prev) => {
        const cur = prev[targetDate] || { date: targetDate, totalRevenue: 0, transactionsCount: 0 };
        return {
          ...prev,
          [targetDate]: {
            date: targetDate,
            totalRevenue: cur.totalRevenue + amount,
            transactionsCount: cur.transactionsCount + 1,
          },
        };
      });
      setTotalRevenueOverride((prev) => (prev !== null ? prev + amount : amount));
      setTransactions((prev) => [
        {
          id: `TX-DEP-${Date.now()}`,
          type: "DEPOSIT",
          amount,
          method: "MoMo Gateway",
          reference: `REF-${Math.floor(100000 + Math.random() * 900000)}`,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    },
    []
  );

  const resetAllStatsToZero = useCallback(() => {
    setDailyRevenueLedger({});
    setTotalRevenueOverride(0);
    setPartnersCountOverride(0);
    setMembersCountOverride(0);
    setAnalysesCountOverride(0);
    setPendingCountOverride(0);
    setPartnerDeposits([]);
    setTransactions([]);
  }, []);

  const loadScreenshotStats = useCallback(() => {
    const now = new Date();
    const map: Record<string, DailyRevenueEntry> = {};
    const offsets = [
      { offset: 4, rev: 1950, count: 5 },
      { offset: 3, rev: 5100, count: 12 },
      { offset: 2, rev: 2850, count: 7 },
      { offset: 1, rev: 0, count: 0 },
      { offset: 0, rev: 0, count: 0 },
    ];
    offsets.forEach(({ offset, rev, count }) => {
      const d = new Date(now.getTime() - offset * 86400000);
      const iso = d.toISOString().slice(0, 10);
      map[iso] = { date: iso, totalRevenue: rev, transactionsCount: count };
    });
    setDailyRevenueLedger(map);
    setTotalRevenueOverride(214600);
    setPartnersCountOverride(8);
    setMembersCountOverride(4198);
    setAnalysesCountOverride(616);
    setPendingCountOverride(6);
  }, []);

  const clearAllOpenBets = useCallback(() => {
    setHistory((prev) => prev.filter((h) => h.status !== "PENDING"));
  }, []);

  const loadDemoOngoingBets = useCallback(() => {
    const mk = (
      id: string,
      marketId: string,
      marketName: string,
      optionId: string,
      optionLabel: string,
      mult: number,
      matchTitle?: string,
      kickoffTime?: string
    ): Selection => ({
      matchId: id,
      marketId,
      marketName,
      optionId,
      optionLabel,
      multiplier: mult,
      matchTitle,
      kickoffTime,
    });

    setHistory((prev) => [
      {
        code: "BTX-ACC4",
        createdAt: new Date().toISOString(),
        stake: 10.00,
        potWin: 55.66,
        status: "PENDING",
        payout: 0,
        isLive: true,
        matchTitle: "Panathinaikos vs Asteras Tripolis",
        cashoutAvailable: true,
        cashoutValue: 10.00,
        selections: [
          mk("m-pana", "1x2-2up", "1X2 - 2UP", "home", "Home", 1.23, "Panathinaikos vs Asteras Tripolis", "18/10 14:30"),
          mk("m-lorient", "ou", "Monaco Over/Under", "o05", "Over 0.5", 1.23, "Lorient vs Monaco", "18/10 15:15"),
          mk("m-nott", "1x2-2up", "1X2 - 2UP", "away", "Away", 1.60, "Nottingham Forest vs Arsenal", "18/10 15:30"),
        ],
      },
      {
        code: "BTX-UD14",
        createdAt: new Date(Date.now() - 300000).toISOString(),
        stake: 14.00,
        potWin: 42.80,
        status: "PENDING",
        payout: 0,
        isLive: true,
        matchTitle: "Udinese vs Lecce",
        cashoutAvailable: false,
        cashoutValue: 23.00,
        selections: [
          mk("m-udi", "1x2", "Match Result", "home", "Home", 1.85, "Udinese vs Lecce", "18/10 13:30"),
          mk("m-emp", "ou", "Total Goals", "o15", "Over 1.5", 1.35, "Empoli vs Monza", "18/10 16:00"),
        ],
      },
      {
        code: "BTX-UD10",
        createdAt: new Date(Date.now() - 900000).toISOString(),
        stake: 10.00,
        potWin: 38.50,
        status: "PENDING",
        payout: 0,
        isLive: true,
        matchTitle: "Udinese vs Lecce",
        cashoutAvailable: false,
        cashoutValue: 16.50,
        selections: [
          mk("m-udi2", "1x2", "Match Result", "draw", "Draw", 3.20, "Udinese vs Lecce", "18/10 13:30"),
          mk("m-rom", "btts", "Both Teams To Score", "yes", "Yes", 1.70, "Roma vs Inter", "18/10 18:45"),
        ],
      },
      ...prev.filter((h) => h.code !== "BTX-ACC4" && h.code !== "BTX-UD14" && h.code !== "BTX-UD10"),
    ]);
  }, []);

  const toggleCashoutAvailable = useCallback((code: string) => {
    setHistory((prev) =>
      prev.map((h) => (h.code === code ? { ...h, cashoutAvailable: !h.cashoutAvailable } : h))
    );
  }, []);

  const login = useCallback((userPhone?: string, referralCode?: string) => {
    setIsLoggedIn(true);
    if (userPhone && userPhone.trim().length > 0) {
      setPhone(userPhone.trim());
    }
    if (referralCode && referralCode.trim().length > 0) {
      const code = referralCode.trim().toUpperCase();
      setReferredByPartner(code);
      setPartnersList((prev) =>
        prev.map((p) => (p.code.toUpperCase() === code ? { ...p, signups: p.signups + 1 } : p))
      );
    }
  }, []);

  const logout = useCallback(() => setIsLoggedIn(false), []);

  const toggleSelection = useCallback((s: Selection) => {
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
  }, []);

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
      const entry: HistoryEntry = {
        code: makeCode(),
        createdAt: new Date().toISOString(),
        stake,
        selections: slip,
        status: "PENDING",
        payout: 0,
      };
      setHistory((h) => [entry, ...h]);
      setBalance((p) => Math.max(0, p - stake));
      setTransactions((t) => [
        {
          id: `TX-${entry.code}`,
          type: "STAKE",
          amount: stake,
          method: "Bet Stake",
          reference: entry.code,
          createdAt: new Date().toISOString(),
        },
        ...t,
      ]);
      setSlip([]);
      setNotifications((n) => [
        { id: entry.code, title: "Bet placed (GHS)", body: `Slip ${entry.code} placed with GHS ${stake.toFixed(2)} stake.`, time: "just now", read: false, kind: "result" },
        ...n,
      ]);
      return entry;
    },
    [slip],
  );

  const markAllRead = useCallback(() => setNotifications((n) => n.map((x) => ({ ...x, read: true }))), []);
  const markRead = useCallback((id: string) => setNotifications((n) => n.map((x) => (x.id === id ? { ...x, read: true } : x))), []);

  const deposit = useCallback(
    (amount: number, method = "Mobile Money Gateway", reference?: string) => {
      const ref = reference || `PAY-GHS-${amount}-${Math.floor(1000 + Math.random() * 9000)}`;
      setBalance((prev) => prev + amount);
      setTransactions((prev) => [
        {
          id: `TX-DEP-${Date.now()}`,
          type: "DEPOSIT",
          amount,
          method,
          reference: ref,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);

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
      return prev - amount;
    });
    const ref = `WTH-GHS-${amount}-${Math.floor(1000 + Math.random() * 9000)}`;
    setTransactions((prev) => [
      {
        id: `TX-WTH-${Date.now()}`,
        type: "WITHDRAWAL",
        amount,
        method: `${method} (${accountDetails || "MoMo"})`,
        reference: ref,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
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
      // Pass Ghana's current date so ESPN returns today's matches in Ghana time
      const todayParam = espnDateParam(0);
      const res = await fetchLiveSportsFixtures(undefined, todayParam);
      setApiMatches(res.matches);
      setApiLiveCount(res.liveCount);
      setApiSourcesFetched(res.sourcesFetched);
      // Show last-update clock in Ghana GMT
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

    if (!enableLiveApi || apiMatches.length === 0) {
      const uniqueSeed = seedMatches.filter((m) => !adminIds.has(m.id));
      return [...convertedAdmin, ...uniqueSeed];
    }
    const nonAdminApi = apiMatches.filter((m) => !adminIds.has(m.id));
    const apiAndAdminIds = new Set([...adminIds, ...nonAdminApi.map((m) => m.id)]);
    const uniqueSeed = seedMatches.filter((m) => !apiAndAdminIds.has(m.id));
    return [...convertedAdmin, ...nonAdminApi, ...uniqueSeed];
  }, [adminMatches, adminLeagues, apiMatches, enableLiveApi, tick]);

  const value: BetrixState = {
    profile: {
      phone,
      userId: "6939B805",
      verified: true,
      tier: "BRONZE I",
      memberSince: "Sep 2026",
      status: "Active",
      nextUpdateDate: "01 Oct",
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

export const formatPoints = (n: number) => `GHS ${n.toFixed(2)}`;
export const formatGHS = (n: number) => `GHS ${n.toFixed(2)}`;

