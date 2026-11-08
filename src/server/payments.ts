import crypto from "node:crypto";
import type { AuthedUser } from "./auth";
import { adminDb } from "./db";
import { HttpError, dbError } from "./http";
import {
  createCheckout,
  createPayout,
  getPayment,
  getPayout,
  PAYOUT_NETWORKS,
  SeevApiError,
  SeevNetworkError,
  type PayoutNetwork,
} from "./seev";

export const DEPOSIT_LIMITS = { min: 250, max: 10000 } as const;
export const WITHDRAW_LIMITS = { min: 1, max: 5000 } as const;

async function currentBalance(profileId: string): Promise<number> {
  const { data } = await adminDb()
    .from("profiles")
    .select("balance")
    .eq("id", profileId)
    .maybeSingle();
  return Number(data?.balance ?? 0);
}

// ── Payer identity ──────────────────────────────────────────────────────────

/** "  angela   ANDOR " → "Angela Andor". Returns "" if it isn't a plausible person's name. */
export function cleanPersonName(raw: unknown): string {
  const name = String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  if (name.length < 2 || !/^[\p{L}][\p{L} .'-]*$/u.test(name)) return "";
  return name
    .toLowerCase()
    .replace(/(^|[\s'-])(\p{L})/gu, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

function cleanEmail(raw: unknown): string {
  const email = String(raw ?? "")
    .trim()
    .toLowerCase();
  return email.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : "";
}

/** The account holder's saved name (profiles.full_name), if that column exists and is set. */
async function savedName(profileId: string): Promise<string> {
  const { data, error } = await adminDb()
    .from("profiles")
    .select("full_name")
    .eq("id", profileId)
    .maybeSingle();
  if (error) return ""; // column not migrated yet
  return cleanPersonName((data as { full_name?: string } | null)?.full_name);
}

async function rememberName(profileId: string, name: string) {
  const { error } = await adminDb()
    .from("profiles")
    .update({ full_name: name })
    .eq("id", profileId);
  if (error) console.warn("[profile] could not save full_name:", error.message);
}

// ── Deposits ────────────────────────────────────────────────────────────────

export async function startDeposit(
  user: AuthedUser,
  body: Record<string, unknown>,
  origin: string,
) {
  const amount = Math.round(Number(body["amount"]) * 100) / 100;
  if (!Number.isFinite(amount) || amount < DEPOSIT_LIMITS.min || amount > DEPOSIT_LIMITS.max) {
    throw new HttpError(
      400,
      `Deposit must be between GHS ${DEPOSIT_LIMITS.min} and GHS ${DEPOSIT_LIMITS.max}.`,
    );
  }

  // SeevPlus shows this name to the payer and flags placeholder customer details,
  // so we always send the person's real name.
  const typedName = cleanPersonName(body["name"]);
  const name = typedName || (await savedName(user.profileId));
  if (!name) throw new HttpError(400, "Enter your full name as it appears on your MoMo account.");
  if (typedName) await rememberName(user.profileId, typedName);
  const email = cleanEmail(body["email"]);

  const orderId = `ORD-${crypto.randomUUID()}`;
  let session: { checkoutUrl: string; reference: string };
  try {
    session = await createCheckout({
      amountGhs: amount,
      orderId,
      phone: user.phone,
      name,
      ...(email ? { email } : {}),
      redirectUrl: `${origin}/points?gateway=seevplus&order=${encodeURIComponent(orderId)}`,
    });
  } catch (err) {
    if (err instanceof SeevApiError)
      throw new HttpError(502, `Payment gateway error: ${err.message}`);
    if (err instanceof SeevNetworkError)
      throw new HttpError(502, "Could not reach the payment gateway. Try again.");
    throw err;
  }

  // Record the intent before anything else can fail, so a paid checkout can always be credited.
  const { error } = await adminDb().from("payment_intents").insert({
    reference: session.reference,
    order_id: orderId,
    profile_id: user.profileId,
    phone: user.phone,
    amount,
  });
  if (error) throw dbError(error);

  // Link partner referral code if user is not yet attributed
  const incomingRef = String(
    body["referralCode"] || body["code"] || body["ref"] || body["referral"] || "",
  )
    .trim()
    .toUpperCase();
  if (incomingRef) {
    try {
      await linkReferral(user, incomingRef);
    } catch (err) {
      console.warn("[deposit] referral link failed", err);
    }
  }

  return { checkoutUrl: session.checkoutUrl, reference: session.reference, orderId };
}

async function linkReferral(user: AuthedUser, incomingRef: string) {
  {
    const { data: profile } = await adminDb()
      .from("profiles")
      .select("id, referred_by")
      .eq("id", user.profileId)
      .maybeSingle();

    if (profile && !profile.referred_by) {
      const cleanRef = incomingRef.replace(/^BTX-/, "");
      const { data: partner } = await adminDb()
        .from("partners")
        .select("id, code, signups")
        .or(`code.ilike.${incomingRef},code.ilike.${cleanRef},code.ilike.BTX-${cleanRef}`)
        .eq("status", "APPROVED")
        .maybeSingle();

      if (partner) {
        await adminDb()
          .from("profiles")
          .update({ referred_by: partner.code, updated_at: new Date().toISOString() })
          .eq("id", user.profileId);
        await adminDb()
          .from("partners")
          .update({ signups: (partner.signups || 0) + 1 })
          .eq("id", partner.id);
      }
    }
  }
}

/**
 * The checkout amount is fixed by us when the session is created, so this only guards
 * against an underpayment. The status lookup's units are undocumented (pesewas or GHS),
 * and the gateway may add its processing fee on top, so we accept either unit and up to
 * 20% above the order total.
 */
export function amountMatches(raw: number | undefined, expectedGhs: number) {
  if (raw === undefined) return true;
  const ok = (ghs: number) => ghs >= expectedGhs - 0.01 && ghs <= expectedGhs * 1.2 + 0.01;
  return ok(raw / 100) || ok(raw);
}

/** Deposits whose last gateway answer was "failed" are re-checked for this long. */
const FAILED_RECHECK_MS = 24 * 3600_000;

/**
 * Ensures partner attribution and commission are recorded for a successful deposit.
 * Serves as a reliable safety net if credit_deposit's exact partner code lookup skipped it.
 */
export async function ensurePartnerDepositAttributed(reference: string, amountGhs: number) {
  try {
    const db = adminDb();
    const depositRecordId = `PD-${reference}`;

    // 1. If already recorded, nothing more to do
    const { data: existingDeposit } = await db
      .from("partner_deposits")
      .select("id")
      .eq("id", depositRecordId)
      .maybeSingle();

    if (existingDeposit) return;

    // 2. Fetch payment intent to get profile_id and phone
    const { data: intent } = await db
      .from("payment_intents")
      .select("profile_id, phone")
      .eq("reference", reference)
      .maybeSingle();

    if (!intent?.profile_id) return;

    // 3. Fetch user profile
    const { data: profile } = await db
      .from("profiles")
      .select("id, phone, referred_by, has_deposited")
      .eq("id", intent.profile_id)
      .maybeSingle();

    if (!profile?.referred_by) return;

    const rawRef = profile.referred_by.trim().toUpperCase();
    const cleanRef = rawRef.replace(/^BTX-/, "");

    // 4. Find approved partner
    const { data: partner } = await db
      .from("partners")
      .select("id, code, commission_rate, total_deposits, earnings, active_users")
      .or(`code.ilike.${rawRef},code.ilike.${cleanRef},code.ilike.BTX-${cleanRef}`)
      .eq("status", "APPROVED")
      .maybeSingle();

    if (!partner) return;

    const rate = partner.commission_rate || 0;
    const commission = Math.round(((amountGhs * rate) / 100) * 100) / 100;
    const phone = profile.phone || intent.phone || "";
    const maskedPhone = phone.length >= 7 ? `${phone.slice(0, 3)}***${phone.slice(-4)}` : phone;

    // 5. Insert partner deposit record
    const { error: insertErr } = await db.from("partner_deposits").insert({
      id: depositRecordId,
      partner_id: partner.id,
      partner_code: partner.code,
      user_phone: maskedPhone,
      amount: amountGhs,
      commission_earned: commission,
      status: "Completed",
    });

    if (insertErr && !insertErr.message?.includes("duplicate")) {
      console.error("[partner_deposit] insert failed:", insertErr.message);
    }

    // 6. Update partner stats
    const newTotalDeposits = Math.round(((partner.total_deposits || 0) + amountGhs) * 100) / 100;
    const newEarnings = Math.round(((partner.earnings || 0) + commission) * 100) / 100;
    const newActiveUsers = (partner.active_users || 0) + (profile.has_deposited ? 0 : 1);

    await db
      .from("partners")
      .update({
        total_deposits: newTotalDeposits,
        earnings: newEarnings,
        active_users: newActiveUsers,
      })
      .eq("id", partner.id);

    // 7. Mark user as having deposited
    await db.from("profiles").update({ has_deposited: true }).eq("id", profile.id);
    console.log(
      `[partner_deposit] attributed ${amountGhs} GHS to partner ${partner.code} (${partner.id})`,
    );
  } catch (err) {
    console.error("[partner_deposit] error attributing deposit:", err);
  }
}

/**
 * Credit an intent once SeevPlus confirms it. Safe to call repeatedly.
 * A "failed" answer is not final: the payer can retry the MoMo prompt on the same
 * checkout page, so recent FAILED intents are re-checked as well.
 */
export async function confirmIntent(intent: {
  reference: string;
  amount: number | string;
  status: string;
  created_at?: string | null;
}) {
  if (intent.status === "CREDITED") return "CREDITED";
  if (intent.status === "FAILED") {
    const age = Date.now() - new Date(intent.created_at || 0).getTime();
    if (!(age < FAILED_RECHECK_MS)) return "FAILED";
  }
  const payment = await getPayment(intent.reference);
  const amount = Number(intent.amount);

  if (payment.status === "completed") {
    if (!amountMatches(payment.amountRaw, amount)) {
      console.error("[deposit] amount mismatch", intent.reference, payment.amountRaw, amount);
      throw new HttpError(409, "Payment amount does not match. Please contact support.");
    }
    const { error } = await adminDb().rpc("credit_deposit", {
      p_reference: intent.reference,
      p_amount: amount,
    });
    if (error) throw dbError(error);
    await ensurePartnerDepositAttributed(intent.reference, amount);
    return "CREDITED";
  }
  if (payment.status === "failed") {
    await adminDb()
      .from("payment_intents")
      .update({ status: "FAILED", updated_at: new Date().toISOString() })
      .eq("reference", intent.reference)
      .eq("status", "PENDING");
    return "FAILED";
  }
  return "PENDING";
}

export async function verifyDeposit(user: AuthedUser, body: Record<string, unknown>) {
  const orderId = typeof body["orderId"] === "string" ? body["orderId"] : undefined;
  const reference = typeof body["reference"] === "string" ? body["reference"] : undefined;
  if (!orderId && !reference) throw new HttpError(400, "Missing payment reference.");

  let q = adminDb().from("payment_intents").select("*").eq("profile_id", user.profileId);
  q = orderId ? q.eq("order_id", orderId) : q.eq("reference", reference!);
  const { data: intent } = await q.maybeSingle();
  if (!intent) throw new HttpError(404, "Payment not found.");

  let status: string;
  try {
    status = await confirmIntent(intent);
  } catch (err) {
    if (err instanceof SeevApiError || err instanceof SeevNetworkError) {
      status = "PENDING"; // gateway hiccup: report pending, the client will retry
    } else {
      throw err;
    }
  }
  return { status, amount: Number(intent.amount), balance: await currentBalance(user.profileId) };
}

// ── Withdrawals ─────────────────────────────────────────────────────────────

/** Send (or re-send, idempotently) the payout for a RESERVED withdrawal. */
async function submitPayout(
  w: { id: string; amount: number | string; phone: string; network: string },
  profileId: string,
) {
  const db = adminDb();
  try {
    const payout = await createPayout({
      amountGhs: Number(w.amount),
      idempotencyKey: w.id,
      phone: w.phone,
      // The account holder's own name, never a BETRIX placeholder.
      name: (await savedName(profileId)) || w.phone,
      network: w.network as PayoutNetwork,
    });
    const status =
      payout.status === "completed"
        ? "COMPLETED"
        : payout.status === "failed"
          ? "FAILED"
          : "PROCESSING";
    await db.rpc("update_withdrawal", {
      p_id: w.id,
      p_status: status,
      p_seev_reference: payout.reference || null,
      p_reason: status === "FAILED" ? "Rejected by provider" : null,
    });
    return status;
  } catch (err) {
    if (err instanceof SeevApiError && err.status < 500 && err.status !== 429) {
      // Definitive rejection (validation, insufficient merchant balance…): refund the player.
      await db.rpc("update_withdrawal", { p_id: w.id, p_status: "FAILED", p_reason: err.message });
      return "FAILED";
    }
    if (err instanceof SeevApiError && err.code === "PAYOUT_FAILED") {
      await db.rpc("update_withdrawal", { p_id: w.id, p_status: "FAILED", p_reason: err.message });
      return "FAILED";
    }
    // Unknown outcome (timeout / 5xx): keep funds reserved; retrying with the same key is safe.
    console.error("[payout] unknown outcome for", w.id, err);
    return "RESERVED";
  }
}

export async function requestWithdrawal(user: AuthedUser, body: Record<string, unknown>) {
  void user;
  void body;
  throw new HttpError(400, "Withdrawal Requirement: Make 3 times deposit");
}

/** Re-check this user's open withdrawals and deposits with SeevPlus. */
export async function refreshWallet(user: AuthedUser) {
  const db = adminDb();
  const { data: open } = await db
    .from("withdrawals")
    .select("*")
    .eq("profile_id", user.profileId)
    .in("status", ["RESERVED", "PROCESSING"]);

  for (const w of open || []) {
    if (w.status === "RESERVED") {
      await submitPayout(w, user.profileId);
    } else if (w.seev_reference) {
      try {
        const p = await getPayout(w.seev_reference);
        if (p.status !== "processing") {
          await db.rpc("update_withdrawal", {
            p_id: w.id,
            p_status: p.status === "completed" ? "COMPLETED" : "FAILED",
            p_reason: p.status === "failed" ? "Rejected by provider" : null,
          });
        }
      } catch (err) {
        console.warn("[payout] status check failed", w.id, err);
      }
    }
  }

  // Webhooks are delivered once with no retry, so this is the safety net for missed ones.
  const since = new Date(Date.now() - 2 * 86400_000).toISOString();
  const { data: intents } = await db
    .from("payment_intents")
    .select("*")
    .eq("profile_id", user.profileId)
    .in("status", ["PENDING", "FAILED"])
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(10);
  for (const intent of intents || []) {
    try {
      await confirmIntent(intent);
    } catch (err) {
      console.warn("[deposit] status check failed", intent.reference, err);
    }
  }

  return { balance: await currentBalance(user.profileId) };
}
