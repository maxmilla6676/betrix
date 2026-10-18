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
}

export const adminUsers: AdminUser[] = [
  { id: "u1", name: "Kwame Mensah", username: "kwame", email: "kwame@betrix.app", role: "USER", status: "ACTIVE", points: 12450, slips: 34, joined: "2026-01-12" },
  { id: "u2", name: "Ama Owusu", username: "ama", email: "ama@betrix.app", role: "PARTNER", status: "ACTIVE", points: 28800, slips: 91, joined: "2025-11-04" },
  { id: "u3", name: "Daniel Adjei", username: "dadjei", email: "daniel@betrix.app", role: "USER", status: "ACTIVE", points: 5120, slips: 12, joined: "2026-02-18" },
  { id: "u4", name: "Nadia Farouk", username: "nadia", email: "nadia@betrix.app", role: "ADMIN", status: "ACTIVE", points: 40000, slips: 8, joined: "2025-08-22" },
  { id: "u5", name: "Tomás Silva", username: "tsilva", email: "tomas@betrix.app", role: "USER", status: "SUSPENDED", points: 300, slips: 57, joined: "2025-12-30" },
  { id: "u6", name: "Grace Boateng", username: "graceb", email: "grace@betrix.app", role: "USER", status: "ACTIVE", points: 19240, slips: 46, joined: "2026-03-09" },
  { id: "u7", name: "Ibrahim Sow", username: "isow", email: "ibrahim@betrix.app", role: "PARTNER", status: "ACTIVE", points: 15600, slips: 23, joined: "2026-01-27" },
  { id: "u8", name: "Lena Fischer", username: "lenaf", email: "lena@betrix.app", role: "USER", status: "ACTIVE", points: 8975, slips: 19, joined: "2026-04-02" },
];

export const seedPartners: PartnerRecord[] = [
  {
    id: "p1",
    name: "Ama Owusu",
    code: "BTX-AMA",
    signups: 412,
    activeUsers: 268,
    slipsDriven: 3140,
    totalDeposits: 64500,
    commissionRate: 15,
    tier: "Gold",
    status: "APPROVED",
    email: "ama@betrix.app",
    phone: "0244123456",
    channel: "Telegram VIP Tipsters Channel",
    audienceSize: "45,000+ members",
    appliedAt: "2026-01-10",
  },
  {
    id: "p2",
    name: "Ibrahim Sow",
    code: "BTX-SOW",
    signups: 187,
    activeUsers: 96,
    slipsDriven: 1120,
    totalDeposits: 28400,
    commissionRate: 12,
    tier: "Silver",
    status: "APPROVED",
    email: "ibrahim@betrix.app",
    phone: "0209876543",
    channel: "YouTube: Ghana Football Daily",
    audienceSize: "18,500 subscribers",
    appliedAt: "2026-02-14",
  },
  {
    id: "p3",
    name: "PitchTalk Media",
    code: "BTX-PITCH",
    signups: 96,
    activeUsers: 51,
    slipsDriven: 640,
    totalDeposits: 14200,
    commissionRate: 10,
    tier: "Bronze",
    status: "APPROVED",
    email: "contact@pitchtalk.gh",
    phone: "0551239870",
    channel: "PitchTalk Sports Blog & Podcast",
    audienceSize: "12,000 monthly readers",
    appliedAt: "2026-03-01",
  },
  {
    id: "p4",
    name: "Terrace Podcast",
    code: "BTX-TERRACE",
    signups: 58,
    activeUsers: 30,
    slipsDriven: 402,
    totalDeposits: 8900,
    commissionRate: 10,
    tier: "Bronze",
    status: "APPROVED",
    email: "terrace@podcast.com",
    phone: "0245551212",
    channel: "Twitter / X Sports Community",
    audienceSize: "9,400 followers",
    appliedAt: "2026-03-18",
  },
  {
    id: "p-pending-1",
    name: "Kofi Boateng",
    code: "BTX-ACCRA",
    signups: 0,
    activeUsers: 0,
    slipsDriven: 0,
    totalDeposits: 0,
    commissionRate: 10,
    tier: "Bronze",
    status: "PENDING",
    email: "kofi@accrabetclub.com",
    phone: "0271122334",
    channel: "WhatsApp & TikTok Football Predictions",
    audienceSize: "14,200 active followers",
    appliedAt: "Today, 10:30 AM",
    notes: "Top football analyst in Kumasi and Accra looking for exclusive partnership link.",
  },
  {
    id: "p-pending-2",
    name: "Nana Yaw Sports Media",
    code: "BTX-NANAYAW",
    signups: 0,
    activeUsers: 0,
    slipsDriven: 0,
    totalDeposits: 0,
    commissionRate: 12,
    tier: "Bronze",
    status: "PENDING",
    email: "nanayaw@sportsmedia.gh",
    phone: "0503344556",
    channel: "Facebook Ghana Sports Fans Group",
    audienceSize: "28,000 group members",
    appliedAt: "Yesterday, 16:45",
    notes: "Runs live watchalongs for Premier League and Ghana Black Stars matches.",
  },
];

export const seedPartnerDeposits: PartnerDepositRecord[] = [
  { id: "dep-1", partnerId: "p1", partnerCode: "BTX-AMA", userPhone: "024***8912", amount: 1500.0, commissionEarned: 225.0, date: "Today, 14:20", status: "Completed" },
  { id: "dep-2", partnerId: "p1", partnerCode: "BTX-AMA", userPhone: "020***5410", amount: 600.0, commissionEarned: 90.0, date: "Today, 11:05", status: "Completed" },
  { id: "dep-3", partnerId: "p1", partnerCode: "BTX-AMA", userPhone: "055***9021", amount: 300.0, commissionEarned: 45.0, date: "Yesterday, 19:40", status: "Completed" },
  { id: "dep-4", partnerId: "p1", partnerCode: "BTX-AMA", userPhone: "024***1188", amount: 1200.0, commissionEarned: 180.0, date: "Yesterday, 16:15", status: "Completed" },
  { id: "dep-5", partnerId: "p1", partnerCode: "BTX-AMA", userPhone: "027***4432", amount: 800.0, commissionEarned: 120.0, date: "08 Oct 2026", status: "Completed" },
  { id: "dep-6", partnerId: "p2", partnerCode: "BTX-SOW", userPhone: "050***7712", amount: 750.0, commissionEarned: 90.0, date: "Today, 09:15", status: "Completed" },
  { id: "dep-7", partnerId: "p2", partnerCode: "BTX-SOW", userPhone: "024***3390", amount: 450.0, commissionEarned: 54.0, date: "Yesterday, 18:30", status: "Completed" },
  { id: "dep-8", partnerId: "p3", partnerCode: "BTX-PITCH", userPhone: "054***6611", amount: 1000.0, commissionEarned: 100.0, date: "Yesterday, 14:10", status: "Completed" },
];

export const partners: PartnerRecord[] = seedPartners;

export const growthSeries = [
  { label: "Mon", users: 120, slips: 340 },
  { label: "Tue", users: 168, slips: 402 },
  { label: "Wed", users: 145, slips: 388 },
  { label: "Thu", users: 210, slips: 520 },
  { label: "Fri", users: 288, slips: 690 },
  { label: "Sat", users: 402, slips: 980 },
  { label: "Sun", users: 356, slips: 870 },
];

export const auditLog = [
  { id: "a1", actor: "nadia", action: "Updated Ama Owusu commission rate to 15%", at: "Today 08:14" },
  { id: "a2", actor: "system", action: "Auto-calculated Dev Commission: GHS 4,440.00 (30%)", at: "Today 07:02" },
  { id: "a3", actor: "nadia", action: "Settled match day deposits & revenue reports", at: "Yesterday 19:41" },
  { id: "a4", actor: "system", action: "Processed partner referral payout credits", at: "Yesterday 00:00" },
  { id: "a5", actor: "nadia", action: "Published market: Both Teams To Score", at: "Mon 15:22" },
];
