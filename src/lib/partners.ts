import type { PartnerRecord } from "@/data/admin";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Commission figures for a partner. Mirrors admin_mark_partner_paid in SQL:
 * earned uses the CURRENT rate, unpaid = earned − paid out (never negative).
 */
export function partnerEarnings(
  p: Pick<PartnerRecord, "totalDeposits" | "commissionRate" | "paidOut">,
) {
  const totalDeposits = round2(p.totalDeposits || 0);
  const rate = p.commissionRate || 0;
  const earned = round2((totalDeposits * rate) / 100);
  const paidOut = round2(p.paidOut || 0);
  const unpaid = Math.max(0, round2(earned - paidOut));
  return { totalDeposits, rate, earned, paidOut, unpaid };
}
