/**
 * Vercel Serverless Function: SeevPlus Payout / Withdrawal
 * Path: /api/seevplus/payout
 * --------------------------------------------------------
 * Initiates real payouts/transfers to Mobile Money or Bank Accounts
 * via SeevPlus Developer API (POST https://api.seevplus.com/api/v1/developer/payouts)
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
    const { amount, currency = "GHS", phone, accountName, method = "Mobile Money", metadata } = body;

    if (!amount || Number(amount) <= 0) {
      res.status(400).json({ success: false, error: "Invalid amount. Must be greater than 0." });
      return;
    }

    if (!phone || String(phone).trim().length < 9) {
      res.status(400).json({ success: false, error: "Valid recipient phone number is required for withdrawal." });
      return;
    }

    const apiKey =
      process.env["SEEV_CHECKOUT_API_KEY"] ||
      process.env["VITE_SEEV_CHECKOUT_API_KEY"] ||
      process.env["SEEV_API_KEY"];

    const baseUrl = process.env["SEEV_BASE_URL"] || "https://api.seevplus.com";
    const ref = `WTH-SEEV-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    if (!apiKey) {
      res.status(400).json({
        success: false,
        error: "SeevPlus API Key is not configured. Please set SEEV_CHECKOUT_API_KEY in your environment.",
      });
      return;
    }

    // Amounts in smallest currency unit (pesewas: 10 GHS = 1000)
    const amountInSmallestUnit = Math.round(Number(amount) * 100);

    const subaccountCode =
      body.subaccount ||
      process.env["SEEV_SUBACCOUNT_CODE"] ||
      process.env["VITE_SEEV_SUBACCOUNT_CODE"];

    const payload: Record<string, unknown> = {
      amount: amountInSmallestUnit,
      currency: currency.toUpperCase(),
      recipient: {
        phone: String(phone).trim(),
        name: accountName || "Betrix User",
        method: method,
      },
      metadata: {
        reference: ref,
        phone: String(phone).trim(),
        source: "betrix_sportsbook_withdrawal",
        ...(metadata || {}),
      },
    };

    if (subaccountCode) {
      payload["subaccount"] = subaccountCode;
    }

    const upstreamResponse = await fetch(`${baseUrl}/api/v1/developer/payouts`, {
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
      console.error("[SeevPlus Payout Error]:", responseData);
      res.status(upstreamResponse.status).json({
        success: false,
        error: responseData?.message || responseData?.error || "Error processing withdrawal with SeevPlus Gateway.",
        details: responseData,
      });
      return;
    }

    res.status(200).json({
      success: true,
      payoutId: responseData?.id || responseData?.payout_id,
      reference: ref,
      status: responseData?.status || "pending",
      data: responseData,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("[SeevPlus Payout Handler Error]:", errMessage);
    res.status(500).json({
      success: false,
      error: errMessage,
    });
  }
}
