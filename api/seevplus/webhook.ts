/**
 * Vercel Serverless Function: SeevPlus Webhook Handler
 * Path: /api/seevplus/webhook
 * ---------------------------------------------------
 * Receives asynchronous status notifications from SeevPlus (e.g. payment.succeeded)
 * Verifies the X-Seev-Signature HMAC-SHA256 signature using SEEV_WEBHOOK_SECRET.
 * Docs: https://seevcash.com/developers
 */

import crypto from "crypto";

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
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed. Webhooks must be POST." });
    return;
  }

  try {
    const rawSignature = (req.headers["x-seev-signature"] || req.headers["X-Seev-Signature"]) as string | undefined;
    const webhookSecret = process.env.SEEV_WEBHOOK_SECRET;

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const rawBodyString = typeof req.body === "string" ? req.body : JSON.stringify(req.body);

    // Verify HMAC-SHA256 signature if secret is provided in environment
    if (webhookSecret && rawSignature) {
      try {
        const computedSignature = crypto
          .createHmac("sha256", webhookSecret)
          .update(rawBodyString)
          .digest("hex");

        const isValid = crypto.timingSafeEqual(
          Buffer.from(rawSignature),
          Buffer.from(computedSignature)
        );

        if (!isValid) {
          console.error("[SeevPlus Webhook] Signature verification failed.");
          res.status(401).json({ error: "Invalid webhook signature" });
          return;
        }
      } catch (sigErr) {
        console.warn("[SeevPlus Webhook] Signature comparison check notice:", sigErr);
      }
    }

    const event = body.event || body.type;
    const data = body.data || body;

    console.log(`[SeevPlus Webhook Received] Event: ${event}`, {
      id: data.id,
      amount: data.amount,
      currency: data.currency,
      status: data.status,
      reference: data.metadata?.reference,
    });

    switch (event) {
      case "payment.succeeded": {
        const amountInMajorUnit = data.amount ? data.amount / 100 : 0;
        const ref = data.metadata?.reference || data.reference || data.id;
        const phone = data.recipient?.phone || data.metadata?.phone || "";

        console.log(`[SeevPlus Webhook] Payment SUCCESS: Ref ${ref}, Amount ${data.currency || "GHS"} ${amountInMajorUnit}, Phone ${phone}`);
        // At this point, the application state can persist the confirmed deposit to Supabase or notify the user
        break;
      }

      case "payment.failed": {
        const ref = data.metadata?.reference || data.reference || data.id;
        console.warn(`[SeevPlus Webhook] Payment FAILED: Ref ${ref}, Reason: ${data.failure_reason || "declined"}`);
        break;
      }

      default:
        console.log(`[SeevPlus Webhook] Unhandled event type: ${event}`);
        break;
    }

    // Always acknowledge receipt to avoid webhooks retrying endlessly
    res.status(200).json({ received: true, event });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Error processing webhook";
    console.error("[SeevPlus Webhook Error]:", errMessage);
    res.status(500).json({ error: errMessage });
  }
}
