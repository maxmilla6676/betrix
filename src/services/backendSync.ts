/**
 * Backend Data Sync Service
 * -------------------------
 * Directly syncs real transactions, slips, bets, and partners with Supabase.
 * Seamlessly falls back to local storage if backend tables are pending creation.
 */

import { supabase } from "@/integrations/supabase/client";
import type { TransactionRecord, HistoryEntry } from "@/store/betrix";
import type { PartnerRecord, PartnerDepositRecord } from "@/data/admin";
import type { AdminLeague, AdminMatch } from "@/data/adminMatches";


export async function syncDepositToBackend(tx: TransactionRecord, phone?: string) {
  try {
    const { error } = await supabase.from("transactions").upsert({
      id: tx.id,
      user_phone: phone || "unknown",
      type: tx.type,
      amount: tx.amount,
      method: tx.method,
      reference: tx.reference,
      created_at: tx.createdAt,
    });
    if (error) {
      console.warn("[Backend Sync] Notice on transaction sync:", error.message);
    }
  } catch (err) {
    console.warn("[Backend Sync] Network error syncing transaction:", err);
  }
}

export async function syncSlipToBackend(slip: HistoryEntry, phone?: string) {
  try {
    const { error } = await supabase.from("slips").upsert({
      code: slip.code,
      user_phone: phone || "unknown",
      stake: slip.stake,
      payout: slip.payout,
      pot_win: slip.potWin,
      status: slip.status,
      match_title: slip.matchTitle,
      selections: slip.selections,
      created_at: slip.createdAt,
    });
    if (error) {
      console.warn("[Backend Sync] Notice on slip sync:", error.message);
    }
  } catch (err) {
    console.warn("[Backend Sync] Network error syncing slip:", err);
  }
}

export async function syncPartnerToBackend(partner: PartnerRecord) {
  try {
    const { error } = await supabase.from("partners").upsert({
      id: partner.id,
      name: partner.name,
      email: partner.email,
      phone: partner.phone,
      channel: partner.channel,
      audience_size: partner.audienceSize,
      code: partner.code,
      commission_rate: partner.commissionRate,
      status: partner.status,
      signups: partner.signups || 0,
      active_users: partner.activeUsers || 0,
      total_deposits: partner.totalDeposits || 0,
      earnings: partner.earnings || 0,
    });
    if (error) {
      console.warn("[Backend Sync] Notice on partner sync:", error.message);
    }
  } catch (err) {
    console.warn("[Backend Sync] Network error syncing partner:", err);
  }
}

export async function syncPartnerDepositToBackend(pDep: PartnerDepositRecord) {
  try {
    const { error } = await supabase.from("partner_deposits").upsert({
      id: pDep.id,
      partner_id: pDep.partnerId,
      partner_code: pDep.partnerCode,
      user_phone: pDep.userPhone,
      amount: pDep.amount,
      commission_earned: pDep.commissionEarned,
      status: pDep.status,
      created_at: pDep.createdAt,
    });
    if (error) {
      console.warn("[Backend Sync] Notice on partner deposit sync:", error.message);
    }
  } catch (err) {
    console.warn("[Backend Sync] Network error syncing partner deposit:", err);
  }
}

export async function fetchBackendInitialData() {
  try {
    const [txRes, slipsRes, partnersRes, pDepsRes, leaguesRes, matchesRes] = await Promise.all([
      supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("slips").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("partners").select("*").order("created_at", { ascending: false }),
      supabase.from("partner_deposits").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("admin_leagues").select("*").order("created_at", { ascending: false }),
      supabase.from("admin_matches").select("*").order("created_at", { ascending: false }),
    ]);

    return {
      transactions: txRes.data ? (txRes.data.map((t: any) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        method: t.method,
        reference: t.reference,
        createdAt: t.created_at,
      })) as TransactionRecord[]) : null,

      slips: slipsRes.data ? (slipsRes.data.map((s: any) => ({
        code: s.code,
        createdAt: s.created_at,
        stake: Number(s.stake),
        payout: Number(s.payout),
        potWin: Number(s.pot_win),
        status: s.status,
        matchTitle: s.match_title,
        selections: s.selections || [],
      })) as HistoryEntry[]) : null,

      partners: partnersRes.data ? (partnersRes.data.map((p: any) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone,
        channel: p.channel,
        audienceSize: p.audience_size,
        code: p.code,
        commissionRate: Number(p.commission_rate),
        status: p.status,
        signups: p.signups,
        activeUsers: p.active_users,
        totalDeposits: Number(p.total_deposits),
        earnings: Number(p.earnings),
        createdAt: p.created_at,
      })) as PartnerRecord[]) : null,

      partnerDeposits: pDepsRes.data ? (pDepsRes.data.map((pd: any) => ({
        id: pd.id,
        partnerId: pd.partner_id,
        partnerCode: pd.partner_code,
        userPhone: pd.user_phone,
        amount: Number(pd.amount),
        commissionEarned: Number(pd.commission_earned),
        status: pd.status,
        createdAt: pd.created_at,
        date: pd.created_at ? new Date(pd.created_at).toLocaleDateString() : "—",
      })) as PartnerDepositRecord[]) : null,

      adminLeagues: leaguesRes.data ? (leaguesRes.data.map((l: any) => ({
        id: l.id,
        name: l.name,
        country: l.country,
        color: l.color,
        logoUrl: l.logo_url,
        createdAt: l.created_at,
      })) as AdminLeague[]) : null,

      adminMatches: matchesRes.data ? (matchesRes.data.map((m: any) => ({
        id: m.id,
        leagueId: m.league_id,
        homeTeam: m.home_team,
        awayTeam: m.away_team,
        homeLogoUrl: m.home_logo_url,
        awayLogoUrl: m.away_logo_url,
        kickoffDate: m.kickoff_date,
        kickoffTime: m.kickoff_time,
        outcome: m.outcome,
        outcomeScore: m.outcome_score,
        status: m.status,
        createdAt: m.created_at,
      })) as AdminMatch[]) : null,
    };
  } catch (err) {
    console.warn("[Backend Sync] Could not fetch remote backend data:", err);
    return null;
  }
}


/** Sync a withdrawal transaction to the backend */
export async function syncWithdrawalToBackend(tx: TransactionRecord, phone?: string) {
  return syncDepositToBackend(tx, phone); // same table, same shape
}

/** Sync a settled slip (WON/LOST) status back to Supabase */
export async function syncSlipSettlementToBackend(slip: HistoryEntry, phone?: string) {
  try {
    const { error } = await supabase.from("slips").upsert({
      code: slip.code,
      user_phone: phone || "unknown",
      stake: slip.stake,
      payout: slip.payout,
      pot_win: slip.potWin,
      status: slip.status,
      match_title: slip.matchTitle,
      selections: slip.selections,
      created_at: slip.createdAt,
    });
    if (error) {
      console.warn("[Backend Sync] Notice on slip settlement sync:", error.message);
    }
  } catch (err) {
    console.warn("[Backend Sync] Network error syncing slip settlement:", err);
  }
}

/** Sync an admin-created league to Supabase */
export async function syncAdminLeagueToBackend(league: AdminLeague) {
  try {
    const { error } = await supabase.from("admin_leagues").upsert({
      id: league.id,
      name: league.name,
      country: league.country,
      color: league.color,
      logo_url: league.logoUrl,
      created_at: league.createdAt,
    });
    if (error) {
      console.warn("[Backend Sync] Notice on admin_league sync:", error.message);
    }
  } catch (err) {
    console.warn("[Backend Sync] Network error syncing admin league:", err);
  }
}

/** Delete an admin league from Supabase */
export async function deleteAdminLeagueFromBackend(id: string) {
  try {
    await supabase.from("admin_leagues").delete().eq("id", id);
  } catch (err) {
    console.warn("[Backend Sync] Network error deleting admin league:", err);
  }
}

/** Sync an admin-created match to Supabase */
export async function syncAdminMatchToBackend(match: AdminMatch) {
  try {
    const { error } = await supabase.from("admin_matches").upsert({
      id: match.id,
      league_id: match.leagueId,
      home_team: match.homeTeam,
      away_team: match.awayTeam,
      home_logo_url: match.homeLogoUrl,
      away_logo_url: match.awayLogoUrl,
      kickoff_date: match.kickoffDate,
      kickoff_time: match.kickoffTime,
      outcome: match.outcome,
      outcome_score: match.outcomeScore,
      status: match.status,
      created_at: match.createdAt,
    });
    if (error) {
      console.warn("[Backend Sync] Notice on admin_match sync:", error.message);
    }
  } catch (err) {
    console.warn("[Backend Sync] Network error syncing admin match:", err);
  }
}

/** Delete an admin match from Supabase */
export async function deleteAdminMatchFromBackend(id: string) {
  try {
    await supabase.from("admin_matches").delete().eq("id", id);
  } catch (err) {
    console.warn("[Backend Sync] Network error deleting admin match:", err);
  }
}
