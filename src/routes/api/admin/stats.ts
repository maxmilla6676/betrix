import { createFileRoute } from "@tanstack/react-router";
import { handle, json } from "@/server/http";
import { requireAdmin } from "@/server/auth";
import { adminDb } from "@/server/db";

export const Route = createFileRoute("/api/admin/stats")({
  server: {
    handlers: {
      GET: handle(async ({ request }) => {
        await requireAdmin(request);
        const db = adminDb();

        // 1. Fetch all completed deposits across the entire platform without any row-limit cutoff
        const [depositsRes, countRes] = await Promise.all([
          db
            .from("transactions")
            .select("id, type, amount, method, reference, created_at")
            .eq("type", "DEPOSIT")
            .order("created_at", { ascending: false }),
          db.from("profiles").select("id", { count: "exact", head: true }),
        ]);

        const transactions = (depositsRes.data || []).map((t: any) => ({
          id: t.id,
          type: t.type,
          amount: Number(t.amount || 0),
          method: t.method,
          reference: t.reference,
          createdAt: t.created_at,
        }));

        const totalRevenue = transactions.reduce((acc: number, t: any) => acc + t.amount, 0);

        return json({
          transactions,
          userCount: countRes.count ?? 0,
          totalRevenue,
        });
      }),
    },
  },
});
