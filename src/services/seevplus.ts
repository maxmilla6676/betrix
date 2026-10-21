/**
 * SeevPlus Payment Gateway Client Service
 * --------------------------------------
 * Provides client-side helpers to initialize checkout sessions and
 * verify payments via the SeevPlus developer gateway (/api/seevplus/*).
 */

export interface SeevPaymentInitParams {
  amount: number; // in Cedis (GHS)
  currency?: "GHS" | "USD";
  phone: string;
  name?: string;
  email?: string;
  method?: string;
  subaccount?: string;
  redirectUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface SeevPaymentInitResult {
  success: boolean;
  paymentId?: string;
  checkoutUrl?: string;
  reference: string;
  isSandbox?: boolean;
  error?: string;
}

export interface SeevPaymentVerifyResult {
  verified: boolean;
  status: "succeeded" | "failed" | "pending" | "unknown";
  amount?: number;
  currency?: string;
  reference?: string;
  error?: string;
}

/**
 * Initialize a checkout session with SeevPlus
 */
export async function createSeevCheckout(
  params: SeevPaymentInitParams
): Promise<SeevPaymentInitResult> {
  const generatedRef = `SEEV-${params.currency || "GHS"}-${Math.round(params.amount)}-${Date.now().toString(36).toUpperCase()}`;

  try {
    const response = await fetch("/api/seevplus/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: params.amount,
        currency: params.currency || "GHS",
        phone: params.phone,
        name: params.name || "Betrix User",
        email: params.email || `user.${params.phone.replace(/\D/g, "")}@betrix.hub`,
        reference: generatedRef,
        method: params.method || "MoMo",
        subaccount: params.subaccount,
        redirectUrl:
          params.redirectUrl ||
          (typeof window !== "undefined"
            ? `${window.location.origin}/points?gateway=seevplus&ref=${generatedRef}`
            : undefined),
        metadata: {
          ...params.metadata,
          source: "betrix_sportsbook",
          phone: params.phone,
          timestamp: new Date().toISOString(),
        },
      }),
    });

    let data: any = null;
    try {
      data = await response.json();
    } catch {}

    if (!response.ok || !data?.success) {
      return {
        success: false,
        reference: generatedRef,
        error: data?.error || (response.status === 404 ? "Gateway endpoint unavailable (404)" : `Gateway returned status ${response.status}`),
        isSandbox: data?.isSandbox,
      };
    }

    return {
      success: true,
      paymentId: data.paymentId,
      checkoutUrl: data.checkoutUrl,
      reference: data.reference || generatedRef,
      isSandbox: data.isSandbox,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to connect to SeevPlus gateway";
    return {
      success: false,
      reference: generatedRef,
      error: msg,
    };
  }
}

export interface SeevPayoutParams {
  amount: number; // in GHS
  currency?: "GHS" | "USD";
  phone: string;
  accountName?: string;
  method?: string;
  metadata?: Record<string, unknown>;
}

export interface SeevPayoutResult {
  success: boolean;
  payoutId?: string;
  reference?: string;
  status?: string;
  error?: string;
}

/**
 * Initiate a real payout (withdrawal) via SeevPlus
 */
export async function createSeevPayout(
  params: SeevPayoutParams
): Promise<SeevPayoutResult> {
  try {
    const response = await fetch("/api/seevplus/payout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: params.amount,
        currency: params.currency || "GHS",
        phone: params.phone,
        accountName: params.accountName || "Betrix User",
        method: params.method || "Mobile Money",
        metadata: {
          ...params.metadata,
          source: "betrix_sportsbook_withdrawal",
          phone: params.phone,
          timestamp: new Date().toISOString(),
        },
      }),
    });

    let data: any = null;
    try {
      data = await response.json();
    } catch {}

    if (!response.ok || !data?.success) {
      return {
        success: false,
        error: data?.error || (response.status === 404 ? "Payout endpoint unavailable (404)" : `Payout gateway returned status ${response.status}`),
      };
    }

    return {
      success: true,
      payoutId: data.payoutId,
      reference: data.reference,
      status: data.status || "pending",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to connect to SeevPlus payout gateway";
    return { success: false, error: msg };
  }
}

/**
 * Verify a SeevPlus transaction status by ID or Reference
 */
export async function verifySeevPayment(
  paymentId?: string,
  reference?: string
): Promise<SeevPaymentVerifyResult> {
  try {
    const params = new URLSearchParams();
    if (paymentId) params.set("paymentId", paymentId);
    if (reference) params.set("ref", reference);

    const response = await fetch(`/api/seevplus/verify?${params.toString()}`);
    let data: any = null;
    try {
      data = await response.json();
    } catch {}

    if (!response.ok) {
      return {
        verified: false,
        status: "failed",
        error: data?.error || (response.status === 404 ? "Verify endpoint unavailable (404)" : "Verification failed"),
      };
    }

    return {
      verified: data.verified === true,
      status: data.status || (data.verified ? "succeeded" : "pending"),
      amount: data.amount,
      currency: data.currency,
      reference: data.reference || reference,
    };
  } catch (err: unknown) {
    return {
      verified: false,
      status: "unknown",
      error: err instanceof Error ? err.message : "Error contacting verification server",
    };
  }
}
