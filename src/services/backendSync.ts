/**
 * Backend Data Sync Service
 * -------------------------
 * Directly syncs real transactions, slips, bets, and partners with Supabase.
 * Seamlessly falls back to local storage if backend tables are pending creation.
 */

import { supabase } from "@/integrations/supabase/client";
import type { TransactionRecord, HistoryEntry } from "@/store/betrix";
import type { PartnerRecord, PartnerDepositRecord } from "@/data/admin";

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
    const [txRes, slipsRes, partnersRes, pDepsRes] = await Promise.all([
      supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("slips").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("partners").select("*").order("created_at", { ascending: false }),
      supabase.from("partner_deposits").select("*").order("created_at", { ascending: false }).limit(100),
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
      })) as PartnerDepositRecord[]) : null,
    };
  } catch (err) {
    console.warn("[Backend Sync] Could not fetch remote backend data:", err);
    return null;
  }
}
