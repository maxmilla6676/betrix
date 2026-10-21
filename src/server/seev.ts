/**
 * SeevPlus API client (server-only).
 * Docs: https://docs.seevcash.com — Checkout API, Payouts API, Developer Webhooks.
 * Checkout and payout amounts are sent in the smallest unit (pesewas).
 */
import crypto from "node:crypto";
import { serverEnv } from "./env";
import { HttpError } from "./http";

async function seevRequest(path: string, init: RequestInit & { idempotencyKey?: string } = {}) {
  const { seevApiKey, seevBaseUrl } = serverEnv();
  if (!seevApiKey) throw new HttpError(503, "Payments are not configured on the server.");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${seevApiKey}`,
    Accept: "application/json",
  };
  if (init.body) headers["Content-Type"] = "application/json";
  if (init.idempotencyKey) headers["Idempotency-Key"] = init.idempotencyKey;

  let res: Response;
  try {
    res = await fetch(`${seevBaseUrl}${path}`, {
      ...init,
      headers,
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    // Network failure / timeout: the outcome is unknown, callers must treat it as "retry later".
    throw new SeevNetworkError(err instanceof Error ? err.message : String(err));
  }
  const body: any = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body, data: body?.data ?? body };
}

export class SeevNetworkError extends Error {}

export class SeevApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

function apiError(r: { status: number; body: any }) {
  const message = r.body?.message || r.body?.error || `SeevPlus returned HTTP ${r.status}`;
  return new SeevApiError(r.status, String(message), r.body?.code);
}

const toPesewas = (ghs: number) => Math.round(ghs * 100);

// ── Payments (deposits) ─────────────────────────────────────────────────────

export async function createCheckout(p: {
  amountGhs: number;
  orderId: string;
  phone: string;
  name: string;
  redirectUrl: string;
}) {
  const { seevSubaccount } = serverEnv();
  const payload: Record<string, unknown> = {
    type: "checkout",
    amount: toPesewas(p.amountGhs),
    currency: "GHS",
    recipient: {
      name: p.name,
      email: `${p.phone}@phone.betrix.app`,
      phone: p.phone,
    },
    redirect_url: p.redirectUrl,
    meta: { order_id: p.orderId, phone: p.phone, source: "betrix" },
  };
  if (seevSubaccount) payload["subaccount"] = seevSubaccount;

  const r = await seevRequest("/api/v1/developer/payments", {
    method: "POST",
    body: JSON.stringify(payload),
    idempotencyKey: p.orderId,
  });
  if (!r.ok) throw apiError(r);
  const checkoutUrl: string | undefined = r.data?.checkout_url || r.data?.checkoutUrl;
  const reference: string | undefined = r.data?.reference;
  if (!checkoutUrl || !reference) {
    console.error("[seev] unexpected checkout response", r.body);
    throw new SeevApiError(502, "Payment gateway returned an unexpected response.");
  }
  return { checkoutUrl, reference };
}

export type SeevPaymentStatus = "pending" | "completed" | "failed";

export async function getPayment(
  reference: string,
): Promise<{ status: SeevPaymentStatus; amountRaw?: number }> {
  const r = await seevRequest(`/api/v1/developer/payments/${encodeURIComponent(reference)}`);
  if (!r.ok) throw apiError(r);
  const raw = String(r.data?.status || "").toLowerCase();
  const status: SeevPaymentStatus =
    raw === "completed" || raw === "success" || raw === "succeeded"
      ? "completed"
      : raw === "failed" || raw === "cancelled" || raw === "canceled"
        ? "failed"
        : "pending";
  const amountRaw = typeof r.data?.amount === "number" ? r.data.amount : undefined;
  return { status, amountRaw };
}

// ── Payouts (withdrawals) ───────────────────────────────────────────────────

export const PAYOUT_NETWORKS = ["MTN", "TELECEL", "AIRTELTIGO"] as const;
export type PayoutNetwork = (typeof PAYOUT_NETWORKS)[number];

export type SeevPayoutStatus = "processing" | "completed" | "failed";

function payoutStatus(raw: unknown): SeevPayoutStatus {
  const s = String(raw || "").toLowerCase();
  if (s === "completed" || s === "success" || s === "succeeded") return "completed";
  if (s === "failed" || s === "cancelled" || s === "canceled") return "failed";
  return "processing";
}

export async function createPayout(p: {
  amountGhs: number;
  idempotencyKey: string;
  phone: string;
  name: string;
  network: PayoutNetwork;
}) {
  const r = await seevRequest("/api/v1/merchants/payouts", {
    method: "POST",
    body: JSON.stringify({
      amount: toPesewas(p.amountGhs),
      channel: "mobile_money",
      recipient: { name: p.name, phone: p.phone, network: p.network },
    }),
    idempotencyKey: p.idempotencyKey,
  });
  if (!r.ok) throw apiError(r);
  return { reference: String(r.data?.reference || ""), status: payoutStatus(r.data?.status) };
}

export async function getPayout(reference: string) {
  const r = await seevRequest(`/api/v1/merchants/payouts/${encodeURIComponent(reference)}`);
  if (!r.ok) throw apiError(r);
  return { status: payoutStatus(r.data?.status) };
}

// ── Webhooks ────────────────────────────────────────────────────────────────

/** Verify `X-Seev-Signature: v1=<hex hmac-sha256(secret, timestamp + "." + rawBody)>`. */
export function verifyWebhookSignature(
  rawBody: string,
  timestamp: string | null,
  signature: string | null,
): boolean {
  const { seevWebhookSecret } = serverEnv();
  if (!seevWebhookSecret || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const expected =
    "v1=" +
    crypto.createHmac("sha256", seevWebhookSecret).update(`${timestamp}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature.trim());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
