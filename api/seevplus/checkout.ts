/**
 * Vercel Serverless Function: SeevPlus Checkout Initiation
 * Path: /api/seevplus/checkout
 * --------------------------------------------------------
 * Interacts with SeevPlus Developer API (POST https://api.seevplus.com/api/v1/developer/payments)
 * Docs: https://seevcash.com/developers
 */

interface VercelRequest {
  method?: string;
  body: any;
  headers: Record<string, string | string[] | undefined>;
}

interface VercelResponse {
  status(code: number): VercelResponse;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(200).json({ ok: true });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed. Use POST." });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { amount, currency = "GHS", phone, name, email, redirectUrl, reference, metadata } = body;

    if (!amount || Number(amount) <= 0) {
      res.status(400).json({ success: false, error: "Invalid amount. Must be greater than 0." });
      return;
    }

    const apiKey =
      process.env["SEEV_CHECKOUT_API_KEY"] ||
      process.env["VITE_SEEV_CHECKOUT_API_KEY"] ||
      process.env["SEEV_API_KEY"];

    const baseUrl = process.env["SEEV_BASE_URL"] || "https://api.seevplus.com";
    const ref = reference || `SEEV-${Date.now()}`;

    // If API key is not configured, supply seamless developer sandbox fallback
    if (!apiKey) {
      console.warn("[SeevPlus API] No SEEV_CHECKOUT_API_KEY found in environment. Running in developer sandbox mode.");
      res.status(200).json({
        success: true,
        isSandbox: true,
        paymentId: `pmt_sandbox_${Date.now()}`,
        reference: ref,
        checkoutUrl: null, // Signals modal to execute direct in-app MoMo prompt simulation
        message: "Developer Sandbox Mode active. Add SEEV_CHECKOUT_API_KEY to .env for live gateway processing.",
      });
      return;
    }

    // SeevPlus expects amounts in smallest currency units (e.g., pesewas/cents: 10 GHS = 1000 pesewas)
    const amountInSmallestUnit = Math.round(Number(amount) * 100);

    const subaccountCode =
      body.subaccount ||
      process.env["SEEV_SUBACCOUNT_CODE"] ||
      process.env["VITE_SEEV_SUBACCOUNT_CODE"];

    const payload: Record<string, unknown> = {
      type: "checkout",
      amount: amountInSmallestUnit,
      currency: currency.toUpperCase(),
      recipient: {
        name: name || "Customer",
        email: email || "customer@betrix.hub",
        phone: phone || undefined,
      },
      redirect_url: redirectUrl || undefined,
      metadata: {
        reference: ref,
        phone: phone || "",
        ...(metadata || {}),
      },
    };

    if (subaccountCode) {
      payload["subaccount"] = subaccountCode;
    }

    const upstreamResponse = await fetch(`${baseUrl}/api/v1/developer/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Idempotency-Key": ref,
      },
      body: JSON.stringify(payload),
    });

    const responseData = await upstreamResponse.json().catch(() => null);

    if (!upstreamResponse.ok) {
      console.error("[SeevPlus API Error]:", responseData);
      res.status(upstreamResponse.status).json({
        success: false,
        error: responseData?.message || responseData?.error || "Error from SeevPlus Gateway",
        details: responseData,
      });
      return;
    }

    // Return the checkout URL and payment ID
    res.status(200).json({
      success: true,
      paymentId: responseData?.id || responseData?.payment_id,
      checkoutUrl: responseData?.checkout_url || responseData?.url,
      reference: ref,
      data: responseData,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("[SeevPlus Checkout Handler Error]:", errMessage);
    res.status(500).json({
      success: false,
      error: errMessage,
    });
  }
}
