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

export const DEPOSIT_LIMITS = { min: 1, max: 10000 } as const;
export const WITHDRAW_LIMITS = { min: 1, max: 5000 } as const;

async function currentBalance(profileId: string): Promise<number> {
  const { data } = await adminDb()
    .from("profiles")
    .select("balance")
    .eq("id", profileId)
    .maybeSingle();
  return Number(data?.balance ?? 0);
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

  const orderId = `ORD-${crypto.randomUUID()}`;
  let session: { checkoutUrl: string; reference: string };
  try {
    session = await createCheckout({
      amountGhs: amount,
      orderId,
      phone: user.phone,
      name: `BETRIX ${user.userId}`,
      redirectUrl: `${origin}/points?gateway=seevplus&order=${encodeURIComponent(orderId)}`,
    });
  } catch (err) {
    if (err instanceof SeevApiError)
      throw new HttpError(502, `Payment gateway error: ${err.message}`);
    if (err instanceof SeevNetworkError)
      throw new HttpError(502, "Could not reach the payment gateway. Try again.");
    throw err;
  }

  const { error } = await adminDb().from("payment_intents").insert({
    reference: session.reference,
    order_id: orderId,
    profile_id: user.profileId,
    phone: user.phone,
    amount,
  });
  if (error) throw dbError(error);

  return { checkoutUrl: session.checkoutUrl, reference: session.reference, orderId };
}

/** Amount checks tolerate either unit, since only the status lookup's units are undocumented. */
function amountMatches(raw: number | undefined, expectedGhs: number) {
  if (raw === undefined) return true;
  return Math.abs(raw / 100 - expectedGhs) < 0.01 || Math.abs(raw - expectedGhs) < 0.01;
}

/** Credit an intent once SeevPlus confirms it. Safe to call repeatedly. */
export async function confirmIntent(intent: {
  reference: string;
  amount: number | string;
  status: string;
}) {
  if (intent.status !== "PENDING") return intent.status;
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
  userId: string,
) {
  const db = adminDb();
  try {
    const payout = await createPayout({
      amountGhs: Number(w.amount),
      idempotencyKey: w.id,
      phone: w.phone,
      name: `BETRIX ${userId}`,
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
  const amount = Math.round(Number(body["amount"]) * 100) / 100;
  if (!Number.isFinite(amount) || amount < WITHDRAW_LIMITS.min || amount > WITHDRAW_LIMITS.max) {
    throw new HttpError(
      400,
      `Withdrawal must be between GHS ${WITHDRAW_LIMITS.min} and GHS ${WITHDRAW_LIMITS.max}.`,
    );
  }
  const network = String(body["network"] || "").toUpperCase();
  if (!(PAYOUT_NETWORKS as readonly string[]).includes(network)) {
    throw new HttpError(400, "Choose MTN, Telecel or AirtelTigo.");
  }

  const id = `WTH-${crypto.randomUUID()}`;
  const { error } = await adminDb().rpc("request_withdrawal", {
    p_profile_id: user.profileId,
    p_id: id,
    p_amount: amount,
    p_network: network,
  });
  if (error) throw dbError(error);

  // Payouts always go to the account's own registered number.
  const status = await submitPayout({ id, amount, phone: user.phone, network }, user.userId);
  return { id, status, amount, balance: await currentBalance(user.profileId) };
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
      await submitPayout(w, user.userId);
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

  const since = new Date(Date.now() - 2 * 86400_000).toISOString();
  const { data: intents } = await db
    .from("payment_intents")
    .select("*")
    .eq("profile_id", user.profileId)
    .eq("status", "PENDING")
    .gte("created_at", since);
  for (const intent of intents || []) {
    try {
      await confirmIntent(intent);
    } catch (err) {
      console.warn("[deposit] status check failed", intent.reference, err);
    }
  }

  return { balance: await currentBalance(user.profileId) };
}
