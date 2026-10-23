/**
 * Supabase reads for the browser, plus the few writes RLS allows (admin-only
 * league/match/partner management). Balances, bets and payments are never
 * written from here — they go through /api/* server routes.
 */

import { supabase } from "@/integrations/supabase/client";
import type { TransactionRecord, HistoryEntry } from "@/store/betrix";
import type { PartnerRecord, PartnerDepositRecord, PartnerPayoutRecord } from "@/data/admin";
import {
  adminLeagueFromRow,
  adminMatchFromRow,
  parseAdminMatchOutcome,
  type AdminLeague,
  type AdminMatch,
} from "@/data/adminMatches";

export { normalizePhone } from "@/lib/phone";

const txFromRow = (t: any): TransactionRecord => ({
  id: t.id,
  type: t.type,
  amount: Number(t.amount),
  method: t.method,
  reference: t.reference,
  createdAt: t.created_at,
});

const slipFromRow = (s: any): HistoryEntry => ({
  code: s.code,
  createdAt: s.created_at,
  stake: Number(s.stake ?? 0),
  payout: Number(s.payout ?? 0),
  potWin: Number(s.pot_win ?? 0),
  status: s.status,
  matchTitle: s.match_title,
  selections: s.selections || [],
});

const partnerFromRow = (p: any): PartnerRecord => ({
  id: p.id,
  name: p.name,
  email: p.email ?? undefined,
  phone: p.phone ?? undefined,
  channel: p.channel ?? undefined,
  audienceSize: p.audience_size ?? undefined,
  code: p.code,
  commissionRate: Number(p.commission_rate ?? 0),
  status: p.status,
  signups: p.signups ?? 0,
  activeUsers: p.active_users ?? 0,
  slipsDriven: 0,
  tier: "Bronze",
  totalDeposits: Number(p.total_deposits ?? 0),
  earnings: Number(p.earnings ?? 0),
  paidOut: Number(p.paid_out ?? 0),
  createdAt: p.created_at,
});

const partnerDepositFromRow = (pd: any): PartnerDepositRecord => ({
  id: pd.id,
  partnerId: pd.partner_id,
  partnerCode: pd.partner_code,
  userPhone: pd.user_phone,
  amount: Number(pd.amount),
  commissionEarned: Number(pd.commission_earned),
  status: pd.status,
  createdAt: pd.created_at,
  date: pd.created_at ? new Date(pd.created_at).toLocaleDateString() : "—",
});

export interface OwnProfile {
  userId: string;
  phone: string;
  tier: string;
  role: string;
  balance: number;
  verified: boolean;
  memberSince: string;
}

/**
 * The signed-in user's profile. Looked up by phone because the browser has no
 * SELECT grant on profiles.auth_id; RLS still limits non-admins to their own row.
 */
export async function fetchOwnProfile(): Promise<OwnProfile | null> {
  const { data: auth } = await supabase.auth.getSession();
  const user = auth.session?.user;
  const phone = String(user?.user_metadata?.["phone"] || user?.email?.split("@")[0] || "");
  if (!phone) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, phone, tier, role, balance, verified, created_at")
    .eq("phone", phone)
    .maybeSingle();
  if (error || !data) return null;
  return {
    userId: data.user_id,
    phone: data.phone,
    tier: data.tier || "Bronze",
    role: String(data.role || "USER").toUpperCase(),
    balance: Number(data.balance ?? 0),
    verified: !!data.verified,
    memberSince: new Date(data.created_at || Date.now()).getFullYear().toString(),
  };
}

export async function fetchOwnActivity(phone: string) {
  const [txRes, slipsRes] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .eq("user_phone", phone)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("slips")
      .select("*")
      .eq("user_phone", phone)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  return {
    transactions: (txRes.data || []).map(txFromRow),
    slips: (slipsRes.data || []).map(slipFromRow),
  };
}

/** Leagues and matches created by admins (public read). */
export async function fetchAdminCatalog(): Promise<{
  leagues: AdminLeague[];
  matches: AdminMatch[];
}> {
  const [leaguesRes, matchesRes] = await Promise.all([
    supabase.from("admin_leagues").select("*").order("created_at", { ascending: false }),
    supabase.from("admin_matches").select("*").order("created_at", { ascending: false }),
  ]);
  return {
    leagues: (leaguesRes.data || []).map(adminLeagueFromRow),
    matches: (matchesRes.data || []).map(adminMatchFromRow),
  };
}

const partnerPayoutFromRow = (r: any): PartnerPayoutRecord => ({
  id: r.id,
  partnerId: r.partner_id,
  amount: Number(r.amount),
  commissionRate: Number(r.commission_rate),
  totalDepositsAt: Number(r.total_deposits_at),
  note: r.note ?? undefined,
  createdAt: r.created_at,
});

/** Partners visible to the caller: their own record, or all of them for admins. */
export async function fetchPartnersData() {
  const [partnersRes, depositsRes, payoutsRes] = await Promise.all([
    supabase.from("partners").select("*").order("created_at", { ascending: false }),
    supabase
      .from("partner_deposits")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("partner_payouts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);
  return {
    partners: (partnersRes.data || []).map(partnerFromRow),
    partnerDeposits: (depositsRes.data || []).map(partnerDepositFromRow),
    partnerPayouts: (payoutsRes.data || []).map(partnerPayoutFromRow),
  };
}

/** Admin: record a payout of everything currently owed to the partner. */
export async function markPartnerPaid(partnerId: string, note?: string) {
  const { data, error } = await supabase.rpc("admin_mark_partner_paid", {
    p_partner_id: partnerId,
    p_note: note || null,
  });
  if (error) {
    return {
      success: false,
      error: error.message.includes("NOTHING_TO_PAY")
        ? "Nothing to pay — this partner has no unpaid commission."
        : error.message.includes("FORBIDDEN")
          ? "Admin access required."
          : error.message,
    };
  }
  return { success: true, paid: Number((data as any)?.paid ?? 0) };
}

/** Admin only: recent transactions across all users, and the member count. */
export async function fetchPlatformStats() {
  const [txRes, countRes] = await Promise.all([
    supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(500),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
  ]);
  return {
    transactions: (txRes.data || []).map(txFromRow),
    userCount: countRes.count ?? 0,
  };
}

export async function fetchAllProfilesFromBackend() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, user_id, phone, tier, role, balance, verified, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error || !data) return [];
  return data.map((p: any) => ({
    id: p.id,
    userId: p.user_id,
    phone: p.phone,
    tier: p.tier || "Bronze",
    role: String(p.role || "USER").toUpperCase(),
    balance: Number(p.balance ?? 0),
    verified: !!p.verified,
    createdAt: p.created_at,
    joined: p.created_at ? new Date(p.created_at).toLocaleDateString("en-GB") : "Recently",
  }));
}

export async function updateUserRoleInBackend(phone: string, newRole: "USER" | "ADMIN") {
  const { error } = await supabase.rpc("admin_set_role", { p_phone: phone, p_role: newRole });
  return error ? { success: false, error: error.message } : { success: true };
}

/** Recent community booking codes (no phone numbers or stakes). */
export async function fetchPublicSlipsFromBackend(limit = 10): Promise<HistoryEntry[]> {
  const { data, error } = await supabase.rpc("public_slips", { p_limit: limit });
  if (error || !data) return [];
  return (data as any[]).map((s) => ({ ...slipFromRow(s), stake: 0, payout: 0, potWin: 0 }));
}

export async function fetchSlipByCode(code: string): Promise<HistoryEntry | null> {
  const { data, error } = await supabase.rpc("slip_by_code", { p_code: code });
  const row = Array.isArray(data) ? data[0] : null;
  if (error || !row) return null;
  return { ...slipFromRow(row), stake: 0, payout: 0, potWin: 0 };
}

export async function updatePartnerInBackend(
  id: string,
  patch: { status?: string; commission_rate?: number },
) {
  const { error } = await supabase.from("partners").update(patch).eq("id", id);
  return error ? { success: false, error: error.message } : { success: true };
}

export async function saveAdminLeague(league: AdminLeague) {
  const { error } = await supabase.from("admin_leagues").upsert({
    id: league.id,
    name: league.name,
    country: league.country,
    color: league.color,
    logo_url: league.logoUrl ?? null,
    created_at: league.createdAt,
  });
  return error ? { success: false, error: error.message } : { success: true };
}

export async function deleteAdminLeague(id: string) {
  const { error } = await supabase.from("admin_leagues").delete().eq("id", id);
  return error ? { success: false, error: error.message } : { success: true };
}

export async function saveAdminMatch(match: AdminMatch) {
  const { targetHome, targetAway, outcome, durationMinutes } = parseAdminMatchOutcome(match);
  const outcomeScore = `${targetHome}-${targetAway}:${durationMinutes}`;

  const { error } = await supabase.from("admin_matches").upsert({
    id: match.id,
    league_id: match.leagueId,
    home_team: match.homeTeam,
    away_team: match.awayTeam,
    home_logo_url: match.homeLogoUrl ?? null,
    away_logo_url: match.awayLogoUrl ?? null,
    kickoff_date: match.kickoffDate,
    kickoff_time: match.kickoffTime,
    status: match.status,
    outcome,
    outcome_score: outcomeScore,
    home_score: match.homeScore ?? (match.status === "finished" ? targetHome : null),
    away_score: match.awayScore ?? (match.status === "finished" ? targetAway : null),
    created_at: match.createdAt,
  });
  return error ? { success: false, error: error.message } : { success: true };
}

export async function deleteAdminMatch(id: string) {
  const { error } = await supabase.from("admin_matches").delete().eq("id", id);
  return error ? { success: false, error: error.message } : { success: true };
}

const DELETE_ERRORS: Record<string, string> = {
  FORBIDDEN: "Admin access required.",
  CANNOT_DELETE_SELF: "You can't delete your own account.",
  DEMOTE_ADMIN_FIRST: "This user is an admin. Demote them to user first.",
  HAS_BALANCE:
    "This user still has a balance. It must be withdrawn before the account can be deleted.",
  HAS_PENDING_BETS: "This user has bets that haven't settled yet. Try again after they settle.",
  HAS_OPEN_WITHDRAWAL: "This user has a withdrawal in progress. Try again once it completes.",
  UNKNOWN_USER: "User not found — they may already be deleted.",
  UNKNOWN_PARTNER: "Partner not found — they may already be deleted.",
};

function deleteError(message: string) {
  const code = Object.keys(DELETE_ERRORS).find((k) => message.includes(k));
  return code ? DELETE_ERRORS[code]! : message;
}

/** Admin: permanently delete a user (refused while they have money or bets open). */
export async function deleteUserInBackend(profileId: string) {
  const { error } = await supabase.rpc("admin_delete_user", { p_profile_id: profileId });
  return error ? { success: false, error: deleteError(error.message) } : { success: true };
}

/** Admin: delete a partner, their referral tracking and payout history. */
export async function deletePartnerInBackend(partnerId: string) {
  const { error } = await supabase.rpc("admin_delete_partner", { p_partner_id: partnerId });
  return error ? { success: false, error: deleteError(error.message) } : { success: true };
}
