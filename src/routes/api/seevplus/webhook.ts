import { createFileRoute } from "@tanstack/react-router";
import { handle, json } from "@/server/http";
import { adminDb } from "@/server/db";
import { verifyWebhookSignature } from "@/server/seev";

/**
 * SeevPlus webhook (payment.succeeded / payment.failed).
 * Deliveries are not retried by SeevPlus, so the browser's return-from-checkout
 * verify call and /api/seevplus/refresh act as the fallback.
 */
export const Route = createFileRoute("/api/seevplus/webhook")({
  server: {
    handlers: {
      POST: handle(async ({ request }) => {
        const rawBody = await request.text();
        const ok = verifyWebhookSignature(
          rawBody,
          request.headers.get("x-seev-timestamp"),
          request.headers.get("x-seev-signature"),
        );
        if (!ok) return json({ error: "Invalid signature" }, 401);

        let body: any;
        try {
          body = JSON.parse(rawBody);
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }
        const event = String(body?.event || request.headers.get("x-seev-event-type") || "");
        const tx = body?.data?.transaction || {};
        const reference = typeof tx.reference === "string" ? tx.reference : "";
        const orderId = tx?.metadata?.developer?.order_id ?? tx?.metadata?.order_id;

        const db = adminDb();
        let q = db.from("payment_intents").select("reference, amount, status");
        q = orderId ? q.eq("order_id", String(orderId)) : q.eq("reference", reference);
        const { data: intent } = await q.maybeSingle();
        if (!intent) {
          console.warn("[webhook] no payment intent for", event, reference, orderId);
          return json({ received: true });
        }

        if (event === "payment.succeeded") {
          // Webhook amounts are in major units (GHS).
          const { error } = await db.rpc("credit_deposit", {
            p_reference: intent.reference,
            p_amount: Number(tx.amount),
          });
          if (error) {
            console.error("[webhook] credit failed", intent.reference, error.message);
            return json({ error: "Could not record payment" }, 500);
          }
        } else if (event === "payment.failed") {
          await db
            .from("payment_intents")
            .update({ status: "FAILED", updated_at: new Date().toISOString() })
            .eq("reference", intent.reference)
            .eq("status", "PENDING");
        }
        return json({ received: true });
      }),
    },
  },
});
