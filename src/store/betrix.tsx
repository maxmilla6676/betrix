import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { matchById, teamById, isMatchLocked, type Match } from "@/data/football";
import { fetchLiveSportsFixtures, dynamicTeams } from "@/services/sportsApi";
import { formatClockGhana, espnDateParam } from "@/lib/ghana-time";
import { toast } from "sonner";
import {
  type AdminLeague,
  type AdminMatch,
  convertAdminMatchToMatch,
  computeAdminMatchLiveState,
} from "@/data/adminMatches";
import type { PartnerRecord, PartnerDepositRecord, PartnerPayoutRecord } from "@/data/admin";
import { supabase } from "@/integrations/supabase/client";
import {
  deleteAdminLeague as deleteAdminLeagueRow,
  deleteAdminMatch as deleteAdminMatchRow,
  fetchAdminCatalog,
  fetchOwnActivity,
  fetchOwnProfile,
  fetchPartnersData,
  fetchPlatformStats,
  markPartnerPaid as markPartnerPaidRpc,
  deletePartnerInBackend,
  saveAdminLeague,
  saveAdminMatch,
  updatePartnerInBackend,
} from "@/services/backendSync";
import {
  apiPost,
  ApiError,
  requestSeevPayout,
  startSeevCheckout,
  verifySeevPayment,
  type CheckoutResult,
  type VerifyResult,
  type WithdrawResult,
} from "@/services/seevplus";
import { normalizePhone } from "@/lib/phone";

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
  sourceId?: string | undefined;
  espnDate?: string | undefined;
}

export interface HistoryEntry {
  code: string;
  createdAt: string;
  stake: number;
  selections: Selection[];
  status: "PENDING" | "WON" | "LOST" | "VOID";
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
  role?: string; // "USER" | "ADMIN" | "PARTNER"
  memberSince: string;
  status: string;
  nextUpdateDate: string;
  referredBy?: string | null;
}

export interface TransactionRecord {
  id: string;
  type: "DEPOSIT" | "WITHDRAWAL" | "STAKE" | "PAYOUT" | "REFUND";
  amount: number;
  method?: string;
  reference?: string;
  createdAt: string;
}

export interface DailyRevenueEntry {
  date: string; // "YYYY-MM-DD"
  totalRevenue: number;
  transactionsCount: number;
}

export interface PartnerApplication {
  name: string;
  email: string;
  phone: string;
  /** Password for the partner's login (new account, or the existing account's password). */
  password: string;
  channel: string;
  audienceSize?: string | undefined;
}

interface BetrixState {
  profile: Profile;
  points: number; // alias for balance for backwards compatibility
  balance: number; // GHS balance, always read from the database
  transactions: TransactionRecord[];
  slip: Selection[];
  history: HistoryEntry[];
  notifications: AppNotification[];

  // Auth
  authReady: boolean;
  isLoggedIn: boolean;
  isAdmin: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (phone: string, password: string, referralCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;

  // Slip & bets
  toggleSelection: (s: Selection) => void;
  isSelected: (matchId: string, marketId: string, optionId: string) => boolean;
  removeSelection: (matchId: string, marketId: string) => void;
  clearSlip: () => void;
  loadSlip: (selections: Selection[]) => void;
  totalMultiplier: number;
  /** Place one bet. Defaults to the whole slip as an accumulator; pass `only` for a single. */
  confirmSlip: (stake: number, only?: Selection[]) => Promise<HistoryEntry>;
  settleNow: (scope?: "mine" | "all") => Promise<number>;
  markAllRead: () => void;
  markRead: (id: string) => void;

  // Wallet
  startDeposit: (amount: number) => Promise<CheckoutResult>;
  verifyDeposit: (ref: { orderId?: string; reference?: string }) => Promise<VerifyResult>;
  withdraw: (amount: number, network: string) => Promise<WithdrawResult>;

  // Partners
  partnersList: PartnerRecord[];
  partnerDeposits: PartnerDepositRecord[];
  partnerPayouts: PartnerPayoutRecord[];
  /** Admin: pay out everything a partner is currently owed. Returns the amount paid. */
  markPartnerPaid: (partnerId: string, note?: string) => Promise<number | null>;
  /** Admin: delete a partner and their referral/payout records. */
  deletePartner: (partnerId: string) => Promise<boolean>;
  registerPartner: (data: PartnerApplication) => Promise<{ code?: string; error?: string }>;
  approvePartner: (partnerId: string, commissionRate?: number) => Promise<void>;
  rejectPartner: (partnerId: string, reason?: string) => Promise<void>;
  updatePartnerCommission: (partnerId: string, newRate: number) => Promise<void>;

  // Admin platform stats (empty for non-admins)
  platformTransactions: TransactionRecord[];
  totalRevenue: number;
  todayRevenue: number;
  devCommission: number;
  gatewayCommission: number;
  getRevenueForDate: (dateStr: string) => DailyRevenueEntry;
  totalPartnersCount: number;
  totalUsersCount: number;
  activeAnalysesCount: number;
  pendingPaymentsCount: number;

  // Sports feed
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

  // Admin match & league manager
  adminLeagues: AdminLeague[];
  adminMatches: AdminMatch[];
  loadCatalog: () => Promise<void>;
  addAdminLeague: (l: AdminLeague) => Promise<void>;
  deleteAdminLeague: (id: string) => Promise<void>;
  addAdminMatch: (m: AdminMatch) => Promise<void>;
  deleteAdminMatch: (id: string) => Promise<void>;
  updateAdminMatch: (m: Partial<AdminMatch> & { id: string }) => Promise<void>;

  // Winning celebration modal (The glowing winning cup shown upon FT win)
  winningCelebration: WinningCelebrationData | null;
  showWinningCup: (data: WinningCelebrationData) => void;
  closeWinningCup: () => void;
}

export interface WinningCelebrationData {
  code: string;
  payout: number;
  potWin?: number | undefined;
  stake?: number | undefined;
  matchTitle?: string | undefined;
  selections?: Selection[] | undefined;
}

const Ctx = createContext<BetrixState | null>(null);
// Only UI conveniences live in localStorage now (slip + notifications). Never balances.
const STORAGE_KEY = "betrix.local.v8";

const DEFAULT_PROFILE: Profile = {
  phone: "",
  userId: "",
  verified: false,
  tier: "Bronze",
  role: "USER",
  memberSince: "",
  status: "Active",
  nextUpdateDate: "Next Month",
};

function notif(
  title: string,
  body: string,
  kind: AppNotification["kind"] = "system",
): AppNotification {
  return {
    id: `N-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title,
    body,
    time: "just now",
    read: false,
    kind,
  };
}

export function BetrixProvider({ children }: { children: ReactNode }) {
  const [authId, setAuthId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileData, setProfileData] = useState<Profile>(DEFAULT_PROFILE);
  const [hasProfile, setHasProfile] = useState(false);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [slip, setSlip] = useState<Selection[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [partnersList, setPartnersList] = useState<PartnerRecord[]>([]);
  const [partnerDeposits, setPartnerDeposits] = useState<PartnerDepositRecord[]>([]);
  const [partnerPayouts, setPartnerPayouts] = useState<PartnerPayoutRecord[]>([]);
  const [platformTransactions, setPlatformTransactions] = useState<TransactionRecord[]>([]);
  const [platformUserCount, setPlatformUserCount] = useState(0);
  const [adminLeagues, setAdminLeagues] = useState<AdminLeague[]>([]);
  const [adminMatches, setAdminMatches] = useState<AdminMatch[]>([]);
  const [winningCelebration, setWinningCelebration] = useState<WinningCelebrationData | null>(null);

  const showWinningCup = useCallback((data: WinningCelebrationData) => {
    setWinningCelebration(data);
  }, []);

  const closeWinningCup = useCallback(() => {
    setWinningCelebration(null);
  }, []);

  const authIdRef = useRef<string | null>(null);
  const isLoggedIn = !!authId && hasProfile;
  const isAdmin = isLoggedIn && (profileData.role || "").toUpperCase() === "ADMIN";
  const pushNotification = useCallback(
    (n: AppNotification) => setNotifications((prev) => [n, ...prev].slice(0, 100)),
    [],
  );

  // ── Local UI state (slip + notifications) ──
  // Don't write until we've read, or the empty initial state overwrites the saved slip.
  const [localLoaded, setLocalLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.slip)) setSlip(parsed.slip);
        if (Array.isArray(parsed.notifications)) setNotifications(parsed.notifications);
      }
      // Older versions cached balances and profiles locally; drop them.
      [
        "betrix.state.v7",
        "betrix.profile.v1",
        "betrix.admin_leagues.v1",
        "betrix.admin_matches.v1",
      ].forEach((k) => localStorage.removeItem(k));
    } catch {
      /* storage unavailable */
    }
    setLocalLoaded(true);
  }, []);

  useEffect(() => {
    if (!localLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ slip, notifications }));
    } catch {
      /* storage unavailable */
    }
  }, [localLoaded, slip, notifications]);

  // ── Auth session ──
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      authIdRef.current = data.session?.user.id ?? null;
      setAuthId(data.session?.user.id ?? null);
      if (!data.session) setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextId = session?.user.id ?? null;
      // A different user means their account isn't loaded yet: hold auth-gated pages until it is.
      if (nextId && nextId !== authIdRef.current) setAuthReady(false);
      authIdRef.current = nextId;
      setAuthId(nextId);
      if (!session) setAuthReady(true);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const loadAccount = useCallback(async (_authId: string) => {
    const prof = await fetchOwnProfile();
    if (!prof) {
      setHasProfile(false);
      return null;
    }
    setProfileData((prev) => ({ ...prev, ...prof }));
    setBalance(prof.balance);
    setHasProfile(true);
    const activity = await fetchOwnActivity(prof.phone);
    setTransactions(activity.transactions);
    setHistory(activity.slips);
    return prof;
  }, []);

  const loadPartnersAndStats = useCallback(async (role: string) => {
    const partners = await fetchPartnersData();
    setPartnersList(partners.partners);
    setPartnerDeposits(partners.partnerDeposits);
    setPartnerPayouts(partners.partnerPayouts);
    if ((role || "").toUpperCase() === "ADMIN") {
      const stats = await fetchPlatformStats();
      setPlatformTransactions(stats.transactions);
      setPlatformUserCount(stats.userCount);
    }
  }, []);

  useEffect(() => {
    if (!authId) {
      setHasProfile(false);
      setProfileData(DEFAULT_PROFILE);
      setBalance(0);
      setTransactions([]);
      setHistory([]);
      setPartnersList([]);
      setPartnerDeposits([]);
      setPartnerPayouts([]);
      setPlatformTransactions([]);
      return;
    }
    loadAccount(authId)
      .then((prof) => (prof ? loadPartnersAndStats(prof.role) : undefined))
      .finally(() => setAuthReady(true));
  }, [authId, loadAccount, loadPartnersAndStats]);

  const refreshProfile = useCallback(async () => {
    if (!authId) return;
    const prof = await loadAccount(authId);
    if (prof) await loadPartnersAndStats(prof.role);
  }, [authId, loadAccount, loadPartnersAndStats]);

  const login = useCallback(
    async (rawPhone: string, password: string) => {
      const phone = normalizePhone(rawPhone);
      // Upgrades pre-Supabase-Auth accounts on first login, and tells us the login email.
      const { email, exists } = await apiPost<{ email: string; exists?: boolean }>(
        "/api/auth/migrate",
        {
          phone,
          password,
        },
      );
      if (exists === false) {
        throw new Error("No BETRIX account uses this number yet. Tap Register to create one.");
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error("Incorrect phone number or password.");
      // Resolve only once the profile is loaded, so the next page sees a logged-in user.
      const prof = await loadAccount(data.user.id);
      if (!prof) throw new Error("Your account could not be loaded. Please try again.");
      setAuthReady(true);
    },
    [loadAccount],
  );

  const register = useCallback(
    async (rawPhone: string, password: string, referralCode?: string) => {
      const phone = normalizePhone(rawPhone);
      await apiPost("/api/auth/register", { phone, password, referralCode });
      await login(phone, password);
    },
    [login],
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setSlip([]);
  }, []);

  // ── Catalog of admin-created leagues/matches (public) ──
  const loadCatalog = useCallback(async () => {
    const catalog = await fetchAdminCatalog();
    setAdminLeagues(catalog.leagues);
    setAdminMatches(catalog.matches);
  }, []);

  useEffect(() => {
    loadCatalog();
    const interval = setInterval(loadCatalog, 60000);
    return () => clearInterval(interval);
  }, [loadCatalog]);

  const runAdminWrite = useCallback(
    async (op: Promise<{ success: boolean; error?: string }>) => {
      const res = await op;
      if (!res.success) {
        toast.error(`Save failed: ${res.error || "permission denied"}`);
        return false;
      }
      await loadCatalog();
      return true;
    },
    [loadCatalog],
  );

  const addAdminLeague = useCallback(
    async (l: AdminLeague) => {
      await runAdminWrite(saveAdminLeague(l));
    },
    [runAdminWrite],
  );
  const deleteAdminLeague = useCallback(
    async (id: string) => {
      await runAdminWrite(deleteAdminLeagueRow(id));
    },
    [runAdminWrite],
  );
  const addAdminMatch = useCallback(
    async (m: AdminMatch) => {
      await runAdminWrite(saveAdminMatch(m));
    },
    [runAdminWrite],
  );
  const deleteAdminMatch = useCallback(
    async (id: string) => {
      await runAdminWrite(deleteAdminMatchRow(id));
    },
    [runAdminWrite],
  );
  const updateAdminMatch = useCallback(
    async (m: Partial<AdminMatch> & { id: string }) => {
      const current = adminMatches.find((x) => x.id === m.id);
      if (!current) return;
      await runAdminWrite(saveAdminMatch({ ...current, ...m }));
    },
    [adminMatches, runAdminWrite],
  );

  // ── Live sports feed & match simulation ──
  const [tick, setTick] = useState(0);
  useEffect(() => {
    // 3s interval keeps in-play minutes and progressive goals updating smoothly
    const timer = setInterval(() => setTick((t) => (t + 1) % 1000000), 3000);
    return () => clearInterval(timer);
  }, []);

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
      const res = await fetchLiveSportsFixtures(undefined, espnDateParam(0));
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
    const interval = setInterval(fetchApiMatches, 25000);
    return () => clearInterval(interval);
  }, [fetchApiMatches]);

  const allMatches = useMemo(() => {
    const now = Date.now();
    const convertedAdmin = adminMatches.map((am) => convertAdminMatchToMatch(am, adminLeagues, now));
    const adminIds = new Set(convertedAdmin.map((m) => m.id));
    const combined = [...convertedAdmin, ...apiMatches.filter((m) => !adminIds.has(m.id))];
    const seenIds = new Set<string>();
    const seenPairs = new Set<string>();
    const deduplicated: Match[] = [];

    for (const m of combined) {
      if (seenIds.has(m.id)) continue;
      seenIds.add(m.id);
      const hName = (teamById(m.homeId)?.name || dynamicTeams.get(m.homeId)?.name || m.homeId)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      const aName = (teamById(m.awayId)?.name || dynamicTeams.get(m.awayId)?.name || m.awayId)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      const pairKey = `${hName}___${aName}`;
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);
      deduplicated.push(m);
    }

    return deduplicated.sort((a, b) => {
      if (a.status === "LIVE" && b.status !== "LIVE") return -1;
      if (b.status === "LIVE" && a.status !== "LIVE") return 1;
      if (a.status === "LIVE" && b.status === "LIVE") return (b.minute ?? 0) - (a.minute ?? 0);
      if (a.status === "FINISHED" && b.status !== "FINISHED") return 1;
      if (b.status === "FINISHED" && a.status !== "FINISHED") return -1;
      return a.kickoff.localeCompare(b.kickoff);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminMatches, adminLeagues, apiMatches, enableLiveApi, tick]);

  const findMatch = useCallback(
    (id: string) => allMatches.find((m) => m.id === id) || matchById(id),
    [allMatches],
  );

  // ── Slip ──
  const toggleSelection = useCallback(
    (s: Selection) => {
      const targetMatch = findMatch(s.matchId);
      if (targetMatch && isMatchLocked(targetMatch)) {
        toast.error(
          targetMatch.status === "FINISHED"
            ? "This match has finished. Odds are locked and betting is closed."
            : "This match has already kicked off. Odds are locked until the game ends.",
        );
        return;
      }
      setSlip((prev) => {
        const sameMarket = prev.find((p) => p.matchId === s.matchId && p.marketId === s.marketId);
        if (sameMarket && sameMarket.optionId === s.optionId) {
          return prev.filter((p) => !(p.matchId === s.matchId && p.marketId === s.marketId));
        }
        // One selection per match: picking another market on the same match replaces it.
        return [...prev.filter((p) => p.matchId !== s.matchId), s];
      });
    },
    [findMatch],
  );

  const isSelected = useCallback(
    (matchId: string, marketId: string, optionId: string) =>
      slip.some((p) => p.matchId === matchId && p.marketId === marketId && p.optionId === optionId),
    [slip],
  );

  const removeSelection = useCallback((matchId: string, marketId: string) => {
    setSlip((prev) => prev.filter((p) => !(p.matchId === matchId && p.marketId === marketId)));
  }, []);

  const clearSlip = useCallback(() => setSlip([]), []);
  const loadSlip = useCallback((selections: Selection[]) => {
    const seen = new Set<string>();
    setSlip(selections.filter((s) => !seen.has(s.matchId) && seen.add(s.matchId)));
  }, []);

  const totalMultiplier = useMemo(
    () => Number(slip.reduce((acc, s) => acc * s.multiplier, 1).toFixed(2)),
    [slip],
  );

  const confirmSlip = useCallback(
    async (stake: number, only?: Selection[]) => {
      if (!isLoggedIn) throw new Error("Please log in to place a bet.");
      const legs = only ?? slip;
      const selections = legs.map((s) => {
        const m = findMatch(s.matchId);
        return {
          matchId: s.matchId,
          marketId: s.marketId,
          optionId: s.optionId,
          multiplier: s.multiplier,
          sourceId: m?.sourceId ?? s.sourceId,
          espnDate: m?.espnDate ?? s.espnDate,
          kickoffTime: m?.kickoff ?? s.kickoffTime,
        };
      });
      try {
        const res = await apiPost<{ balance: number; entry: HistoryEntry }>("/api/bets/place", {
          stake,
          selections,
        });
        setBalance(res.balance);
        setHistory((h) => [res.entry, ...h]);
        setTransactions((t) => [
          {
            id: `TX-${res.entry.code}`,
            type: "STAKE",
            amount: stake,
            method: "Bet Stake",
            reference: res.entry.code,
            createdAt: res.entry.createdAt,
          },
          ...t,
        ]);
        const placed = new Set(legs.map((l) => `${l.matchId}|${l.marketId}`));
        setSlip((prev) => prev.filter((p) => !placed.has(`${p.matchId}|${p.marketId}`)));
        pushNotification(
          notif(
            "Bet placed",
            `Slip ${res.entry.code} placed with GHS ${stake.toFixed(2)} stake. Potential win: GHS ${(res.entry.potWin ?? 0).toFixed(2)}.`,
            "result",
          ),
        );
        return res.entry;
      } catch (err) {
        if (err instanceof ApiError && err.status === 409 && Array.isArray(err.data?.selections)) {
          // Odds moved: show the server's prices so the user can review and confirm again.
          const fresh = err.data.selections as Selection[];
          setSlip((prev) =>
            prev.map(
              (p) => fresh.find((f) => f.matchId === p.matchId && f.marketId === p.marketId) ?? p,
            ),
          );
        }
        throw err;
      }
    },
    [isLoggedIn, slip, findMatch, pushNotification],
  );

  // ── Settlement (server decides; we just ask it to check) ──
  const historyRef = useRef(history);
  historyRef.current = history;

  const settleNow = useCallback(
    async (scope: "mine" | "all" = "mine") => {
      const res = await apiPost<{ settled: { code: string; status: string; payout: number }[] }>(
        `/api/bets/settle${scope === "all" ? "?scope=all" : ""}`,
      );
      const mine = new Set(historyRef.current.map((h) => h.code));
      for (const s of res.settled) {
        if (!mine.has(s.code)) continue;
        if (s.status === "WON") {
          const slipData = historyRef.current.find((h) => h.code === s.code);
          toast.success(`🎉 Slip ${s.code} won! GHS ${s.payout.toFixed(2)} credited.`, {
            duration: 6000,
          });
          pushNotification(
            notif(
              "🎉 You Won!",
              `Slip ${s.code} won. GHS ${s.payout.toFixed(2)} has been credited.`,
              "result",
            ),
          );
          // Show the glowing winning cup modal right after FT with potential win credited
          setWinningCelebration({
            code: s.code,
            payout: s.payout,
            potWin: slipData?.potWin ?? s.payout,
            stake: slipData?.stake,
            matchTitle: slipData?.matchTitle,
            selections: slipData?.selections,
          });
        } else if (s.status === "VOID") {
          pushNotification(
            notif("Bet voided", `Slip ${s.code} was voided and your stake refunded.`, "result"),
          );
        } else {
          pushNotification(notif("Bet settled", `Slip ${s.code} lost.`, "result"));
        }
      }
      if (res.settled.length > 0) await refreshProfile();
      return res.settled.length;
    },
    [pushNotification, refreshProfile],
  );

  // Auto-finish and auto-settle admin matches once they reach the end of their match duration
  useEffect(() => {
    const now = Date.now();
    for (const am of adminMatches) {
      if (am.status === "finished" || am.status === "cancelled") continue;
      const state = computeAdminMatchLiveState(am, now);
      if (state.isCompleted && state.status === "FINISHED") {
        if (isAdmin) {
          updateAdminMatch({
            id: am.id,
            status: "finished",
            homeScore: state.homeScore,
            awayScore: state.awayScore,
          }).then(() => {
            settleNow("all").catch(() => undefined);
          });
        } else if (isLoggedIn) {
          // Regular users: settle their finished slips automatically
          settleNow("mine").catch(() => undefined);
        }
      }
    }
  }, [tick, adminMatches, updateAdminMatch, settleNow, isAdmin, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const check = () => {
      // Check when some pending slip has a match that finished or passed its scheduled duration
      const due = historyRef.current.some(
        (h) =>
          h.status === "PENDING" &&
          h.selections.some((s) => {
            const m = allMatches.find((match) => match.id === s.matchId);
            if (m && m.status === "FINISHED") return true;
            const am = adminMatches.find((x) => x.id === s.matchId);
            if (am && computeAdminMatchLiveState(am, Date.now()).isCompleted) return true;
            return s.kickoffTime && Date.now() - new Date(s.kickoffTime).getTime() > 2 * 60000;
          }),
      );
      if (due) settleNow().catch(() => undefined);
    };
    check();
    const interval = setInterval(check, 4000);
    return () => clearInterval(interval);
  }, [isLoggedIn, settleNow, allMatches, adminMatches]);

  const markAllRead = useCallback(
    () => setNotifications((n) => n.map((x) => ({ ...x, read: true }))),
    [],
  );
  const markRead = useCallback(
    (id: string) => setNotifications((n) => n.map((x) => (x.id === id ? { ...x, read: true } : x))),
    [],
  );

  // ── Wallet ──
  const startDeposit = useCallback((amount: number) => startSeevCheckout(amount), []);

  const verifyDeposit = useCallback(
    async (ref: { orderId?: string; reference?: string }) => {
      const res = await verifySeevPayment(ref);
      setBalance(res.balance);
      if (res.status === "CREDITED") {
        await refreshProfile();
        pushNotification(
          notif(
            "Deposit successful",
            `GHS ${res.amount.toFixed(2)} has been credited to your balance.`,
          ),
        );
      }
      return res;
    },
    [refreshProfile, pushNotification],
  );

  const withdraw = useCallback(
    async (amount: number, network: string) => {
      const res = await requestSeevPayout(amount, network);
      setBalance(res.balance);
      await refreshProfile();
      pushNotification(
        notif(
          res.status === "FAILED" ? "Withdrawal failed" : "Withdrawal requested",
          res.status === "FAILED"
            ? `Your GHS ${amount.toFixed(2)} withdrawal was rejected by the provider and refunded.`
            : `GHS ${amount.toFixed(2)} is on its way to your mobile money wallet.`,
        ),
      );
      return res;
    },
    [refreshProfile, pushNotification],
  );

  // ── Partners ──
  // Doesn't log anyone in: the applicant logs in with this number once approved.
  const registerPartner = useCallback(async (data: PartnerApplication) => {
    try {
      const res = await apiPost<{ code: string }>("/api/partners/apply", data);
      return { code: res.code };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Could not submit your application." };
    }
  }, []);

  const updatePartner = useCallback(
    async (id: string, patch: { status?: string; commission_rate?: number }, okMessage: string) => {
      const res = await updatePartnerInBackend(id, patch);
      if (!res.success) {
        toast.error(`Update failed: ${res.error}`);
        return;
      }
      toast.success(okMessage);
      const partners = await fetchPartnersData();
      setPartnersList(partners.partners);
      setPartnerDeposits(partners.partnerDeposits);
      setPartnerPayouts(partners.partnerPayouts);
    },
    [],
  );

  const approvePartner = useCallback(
    (partnerId: string, commissionRate?: number) =>
      updatePartner(
        partnerId,
        typeof commissionRate === "number"
          ? { status: "APPROVED", commission_rate: Math.max(0, Math.min(100, commissionRate)) }
          : { status: "APPROVED" },
        "Partner approved. Their referral link is now active.",
      ),
    [updatePartner],
  );
  const rejectPartner = useCallback(
    (partnerId: string) =>
      updatePartner(partnerId, { status: "REJECTED" }, "Partner application rejected."),
    [updatePartner],
  );
  const updatePartnerCommission = useCallback(
    (partnerId: string, newRate: number) =>
      updatePartner(
        partnerId,
        { commission_rate: Math.max(0, Math.min(100, newRate)) },
        "Commission rate updated.",
      ),
    [updatePartner],
  );

  const deletePartner = useCallback(async (partnerId: string) => {
    const res = await deletePartnerInBackend(partnerId);
    if (!res.success) {
      toast.error(res.error);
      return false;
    }
    const partners = await fetchPartnersData();
    setPartnersList(partners.partners);
    setPartnerDeposits(partners.partnerDeposits);
    setPartnerPayouts(partners.partnerPayouts);
    return true;
  }, []);

  const markPartnerPaid = useCallback(async (partnerId: string, note?: string) => {
    const res = await markPartnerPaidRpc(partnerId, note);
    if (!res.success) {
      toast.error(res.error);
      return null;
    }
    const partners = await fetchPartnersData();
    setPartnersList(partners.partners);
    setPartnerDeposits(partners.partnerDeposits);
    setPartnerPayouts(partners.partnerPayouts);
    return res.paid ?? 0;
  }, []);

  // ── Admin stats ──
  const todayISO = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Accra" }).format(new Date());
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  }, []);
  const platformDeposits = useMemo(
    () => platformTransactions.filter((t) => t.type === "DEPOSIT"),
    [platformTransactions],
  );
  const todayRevenue = useMemo(
    () =>
      platformDeposits
        .filter((t) => (t.createdAt || "").slice(0, 10) === todayISO)
        .reduce((acc, t) => acc + t.amount, 0),
    [platformDeposits, todayISO],
  );
  const totalRevenue = useMemo(
    () => platformDeposits.reduce((acc, t) => acc + t.amount, 0),
    [platformDeposits],
  );
  const getRevenueForDate = useCallback(
    (dateStr: string): DailyRevenueEntry => {
      const day = platformDeposits.filter((t) => (t.createdAt || "").slice(0, 10) === dateStr);
      return {
        date: dateStr,
        totalRevenue: day.reduce((acc, t) => acc + t.amount, 0),
        transactionsCount: day.length,
      };
    },
    [platformDeposits],
  );

  const value: BetrixState = {
    profile: {
      ...profileData,
      role: (profileData.role || "USER").toUpperCase(),
    },
    points: balance,
    balance,
    transactions,
    slip,
    history,
    notifications,
    authReady,
    isLoggedIn,
    isAdmin,
    login,
    register,
    logout,
    refreshProfile,
    toggleSelection,
    isSelected,
    removeSelection,
    clearSlip,
    loadSlip,
    totalMultiplier,
    confirmSlip,
    settleNow,
    markAllRead,
    markRead,
    startDeposit,
    verifyDeposit,
    withdraw,
    partnersList,
    partnerDeposits,
    registerPartner,
    approvePartner,
    rejectPartner,
    updatePartnerCommission,
    partnerPayouts,
    markPartnerPaid,
    deletePartner,
    platformTransactions,
    totalRevenue,
    todayRevenue,
    devCommission: Number((todayRevenue * 0.15).toFixed(2)),
    gatewayCommission: Number((todayRevenue * 0.15).toFixed(2)),
    getRevenueForDate,
    totalPartnersCount: partnersList.filter((p) => p.status === "APPROVED").length,
    totalUsersCount: platformUserCount,
    activeAnalysesCount: history.filter((h) => h.status === "PENDING").length,
    pendingPaymentsCount: partnersList.filter((p) => p.status === "PENDING").length,
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
    adminLeagues,
    adminMatches,
    loadCatalog,
    addAdminLeague,
    deleteAdminLeague,
    addAdminMatch,
    deleteAdminMatch,
    updateAdminMatch,
    winningCelebration,
    showWinningCup,
    closeWinningCup,
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

export { evaluateSelection } from "@/lib/betting";

/** Generate a clean 6-char alphanumeric booking code (e.g. MNKWLL, BECD41). */
export function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export const formatPoints = (n: number) => `GHS ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const formatGHS = (n: number) => `GHS ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
