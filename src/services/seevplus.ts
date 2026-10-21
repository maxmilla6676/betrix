/**
 * Browser helpers for our /api/* routes. Every call carries the user's Supabase
 * access token; the server decides balances, odds and payment outcomes.
 */
import { supabase } from "@/integrations/supabase/client";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data: any,
  ) {
    super(message);
  }
}

export async function apiPost<T = any>(path: string, body: unknown = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Network error. Check your connection and try again.", null);
  }
  const json: any = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, json?.error || `Request failed (${res.status})`, json);
  }
  return json as T;
}

export interface CheckoutResult {
  checkoutUrl: string;
  reference: string;
  orderId: string;
}

export const startSeevCheckout = (amount: number) =>
  apiPost<CheckoutResult>("/api/seevplus/checkout", { amount });

export interface VerifyResult {
  status: "PENDING" | "CREDITED" | "FAILED";
  amount: number;
  balance: number;
}

export const verifySeevPayment = (ref: { orderId?: string; reference?: string }) =>
  apiPost<VerifyResult>("/api/seevplus/verify", ref);

export interface WithdrawResult {
  id: string;
  status: "RESERVED" | "PROCESSING" | "COMPLETED" | "FAILED";
  amount: number;
  balance: number;
}

export const requestSeevPayout = (amount: number, network: string) =>
  apiPost<WithdrawResult>("/api/seevplus/payout", { amount, network });

export const refreshSeevWallet = () => apiPost<{ balance: number }>("/api/seevplus/refresh");
