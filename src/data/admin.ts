export interface AdminUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: "USER" | "ADMIN" | "PARTNER";
  status: "ACTIVE" | "SUSPENDED";
  points: number;
  slips: number;
  joined: string;
}

export interface PartnerRecord {
  id: string;
  name: string;
  code: string;
  signups: number;
  activeUsers: number;
  slipsDriven: number;
  totalDeposits: number; // Total GHS deposited by users using partner's link
  commissionRate: number; // Percentage commission rate (Editable ONLY by Admin)
  tier: "Bronze" | "Silver" | "Gold";
  status: "APPROVED" | "PENDING" | "REJECTED";
  email?: string | undefined;
  phone?: string | undefined;
  channel?: string | undefined;
  channelLink?: string | undefined;
  audienceSize?: string | undefined;
  appliedAt?: string | undefined;
  notes?: string | undefined;
  earnings?: number | undefined;
  /** Commission already paid out to the partner (GHS). */
  paidOut?: number | undefined;
  createdAt?: string | undefined;
}

export interface PartnerPayoutRecord {
  id: number;
  partnerId: string;
  amount: number;
  commissionRate: number;
  totalDepositsAt: number;
  note?: string | undefined;
  createdAt: string;
}

export interface PartnerDepositRecord {
  id: string;
  partnerId: string;
  partnerCode: string;
  userPhone: string;
  amount: number;
  commissionEarned: number;
  date: string;
  status: "Completed" | "Pending";
  createdAt?: string;
}

export const adminUsers: AdminUser[] = [];

export const seedPartners: PartnerRecord[] = [];

export const seedPartnerDeposits: PartnerDepositRecord[] = [];

export const partners: PartnerRecord[] = [];

export const growthSeries: { label: string; users: number; slips: number }[] = [];

export const auditLog: { id: string; actor: string; action: string; at: string }[] = [];
