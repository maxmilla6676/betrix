import { createFileRoute } from "@tanstack/react-router";
import { handle, json } from "@/server/http";
import { adminDb } from "@/server/db";
import { verifyWebhookSignature } from "@/server/seev";
import { amountMatches, confirmIntent, ensurePartnerDepositAttributed } from "@/server/payments";

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
        const cols = "reference, amount, status, created_at";
        let intent: {
          reference: string;
          amount: number | string;
          status: string;
          created_at: string | null;
        } | null = null;
        if (orderId) {
          const { data } = await db
            .from("payment_intents")
            .select(cols)
            .eq("order_id", String(orderId))
            .maybeSingle();
          intent = data;
        }
        if (!intent && reference) {
          const { data } = await db
            .from("payment_intents")
            .select(cols)
            .eq("reference", reference)
            .maybeSingle();
          intent = data;
        }
        if (!intent) {
          console.warn("[webhook] no payment intent for", event, reference, orderId);
          return json({ received: true });
        }

        const txStatus = String(tx.status || "").toLowerCase();
        const succeeded =
          event === "payment.succeeded" ||
          ["completed", "success", "successful", "succeeded", "paid"].includes(txStatus);

        if (succeeded) {
          if (intent.status === "CREDITED") return json({ received: true });
          // Webhook amounts are in major units (GHS). The gateway may add its fee on top,
          // so credit the order total we created the checkout with.
          const expected = Number(intent.amount);
          const paid = Number(tx.amount);
          if (Number.isFinite(paid) && paid > 0 && !amountMatches(paid * 100, expected)) {
            // Unusual amount: fall back to asking SeevPlus directly before crediting.
            console.warn(
              "[webhook] amount differs, verifying via API",
              intent.reference,
              paid,
              expected,
            );
            try {
              await confirmIntent(intent);
            } catch (err) {
              console.error("[webhook] verify failed", intent.reference, err);
            }
            return json({ received: true });
          }
          const { error } = await db.rpc("credit_deposit", {
            p_reference: intent.reference,
            p_amount: expected,
          });
          if (error) {
            console.error("[webhook] credit failed", intent.reference, error.message);
            return json({ error: "Could not record payment" }, 500);
          }
          await ensurePartnerDepositAttributed(intent.reference, expected);
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
