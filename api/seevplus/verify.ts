/**
 * Vercel Serverless Function: SeevPlus Payment Verification
 * Path: /api/seevplus/verify
 * ---------------------------------------------------------
 * Verifies transaction status directly with the SeevPlus Developer API.
 * GET /api/seevplus/verify?paymentId=pmt_123 or ref=SEEV-...
 */

interface VercelRequest {
  method?: string;
  query: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
}

interface VercelResponse {
  status(code: number): VercelResponse;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    res.status(200).json({ ok: true });
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed. Use GET." });
    return;
  }

  const paymentId = (req.query ? (req.query["paymentId"] || req.query["id"]) : undefined) as string | undefined;
  const reference = (req.query ? (req.query["ref"] || req.query["reference"]) : undefined) as string | undefined;

  if (!paymentId && !reference) {
    res.status(400).json({ error: "Missing required parameter: 'paymentId' or 'ref'" });
    return;
  }

  const apiKey =
    process.env["SEEV_CHECKOUT_API_KEY"] ||
    process.env["VITE_SEEV_CHECKOUT_API_KEY"] ||
    process.env["SEEV_API_KEY"];

  const baseUrl = process.env["SEEV_BASE_URL"] || "https://api.seevplus.com";

  // If in sandbox mode without keys
  if (!apiKey || (paymentId && paymentId.startsWith("pmt_sandbox_"))) {
    res.status(200).json({
      verified: true,
      status: "succeeded",
      isSandbox: true,
      paymentId: paymentId || "sandbox",
      reference: reference || "SANDBOX-REF",
    });
    return;
  }

  try {
    const fetchUrl = paymentId
      ? `${baseUrl}/api/v1/developer/payments/${encodeURIComponent(paymentId)}`
      : `${baseUrl}/api/v1/developer/payments?reference=${encodeURIComponent(reference || "")}`;

    const upstreamResponse = await fetch(fetchUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });

    if (!upstreamResponse.ok) {
      res.status(upstreamResponse.status).json({
        verified: false,
        error: `SeevPlus API responded with status ${upstreamResponse.status}`,
      });
      return;
    }

    const data = await upstreamResponse.json();
    const isSucceeded = data?.status === "succeeded" || data?.status === "completed";

    res.status(200).json({
      verified: isSucceeded,
      status: data?.status || (isSucceeded ? "succeeded" : "pending"),
      paymentId: data?.id,
      amount: data?.amount ? data.amount / 100 : undefined,
      currency: data?.currency || "GHS",
      reference: data?.metadata?.reference || reference,
      raw: data,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Error contacting gateway";
    res.status(500).json({ verified: false, error: errMessage });
  }
}
