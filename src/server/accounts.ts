import crypto from "node:crypto";
import { isValidGhanaPhone, normalizePhone, phoneToAuthEmail } from "@/lib/phone";
import { adminDb } from "./db";
import { HttpError } from "./http";

const MIN_PASSWORD = 6;

function readCredentials(body: Record<string, unknown>) {
  const phone = normalizePhone(String(body["phone"] || ""));
  const password = String(body["password"] || "");
  if (!isValidGhanaPhone(phone))
    throw new HttpError(400, "Enter a valid Ghana phone number (e.g. 024 123 4567).");
  if (password.length < MIN_PASSWORD || password.length > 128) {
    throw new HttpError(400, `Password must be at least ${MIN_PASSWORD} characters.`);
  }
  return { phone, password };
}

async function createAuthUser(phone: string, password: string): Promise<string> {
  const { data, error } = await adminDb().auth.admin.createUser({
    email: phoneToAuthEmail(phone),
    password,
    email_confirm: true,
    user_metadata: { phone },
  });
  if (error || !data.user) {
    if (/already/i.test(error?.message || "")) {
      throw new HttpError(409, "An account with this phone number already exists. Please log in.");
    }
    console.error("[auth] createUser failed:", error?.message);
    throw new HttpError(500, "Could not create your account. Please try again.");
  }
  return data.user.id;
}

/** Create a Supabase Auth user + profile. The browser then signs in normally. */
export async function registerAccount(body: Record<string, unknown>) {
  const { phone, password } = readCredentials(body);
  const db = adminDb();

  const { data: existing } = await db
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();
  if (existing)
    throw new HttpError(409, "An account with this phone number already exists. Please log in.");

  // Only approved partner codes are recorded as referrals.
  let referredBy: string | null = null;
  const ref = String(body["referralCode"] || "")
    .trim()
    .toUpperCase();
  if (ref) {
    const { data: partner } = await db
      .from("partners")
      .select("id, code, signups")
      .ilike("code", ref)
      .eq("status", "APPROVED")
      .maybeSingle();
    if (partner) {
      referredBy = partner.code;
      await db
        .from("partners")
        .update({ signups: (partner.signups || 0) + 1 })
        .eq("id", partner.id);
    }
  }

  const authId = await createAuthUser(phone, password);
  const userId = crypto.randomBytes(4).toString("hex").toUpperCase();
  const { error } = await db.from("profiles").insert({
    auth_id: authId,
    user_id: userId,
    phone,
    tier: "Bronze",
    role: "USER",
    balance: 0,
    verified: true,
    referred_by: referredBy,
  });
  if (error) {
    await db.auth.admin.deleteUser(authId);
    console.error("[auth] profile insert failed:", error.message);
    throw new HttpError(500, "Could not create your account. Please try again.");
  }
  return { ok: true, email: phoneToAuthEmail(phone) };
}

/**
 * Accounts created before Supabase Auth only have an unsalted SHA-256 hash.
 * On their first login we check it once, create the Auth user with the same
 * password, and delete the old hash. Returns the email to sign in with.
 */
export async function migrateLegacyAccount(body: Record<string, unknown>) {
  const { phone, password } = readCredentials(body);
  const db = adminDb();
  const email = phoneToAuthEmail(phone);

  const { data: profile } = await db
    .from("profiles")
    .select("id, auth_id, password_hash")
    .eq("phone", phone)
    .maybeSingle();

  // Unknown numbers and already-migrated accounts both just sign in normally.
  if (!profile || profile.auth_id) return { email };

  if (!profile.password_hash) {
    throw new HttpError(403, "This account needs to be reactivated. Please contact support.");
  }
  const hash = crypto.createHash("sha256").update(password).digest("hex");
  const a = Buffer.from(hash);
  const b = Buffer.from(String(profile.password_hash));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new HttpError(401, "Incorrect phone number or password.");
  }

  const authId = await createAuthUser(phone, password);
  const { error } = await db
    .from("profiles")
    .update({ auth_id: authId, password_hash: null, updated_at: new Date().toISOString() })
    .eq("id", profile.id)
    .is("auth_id", null);
  if (error) {
    await db.auth.admin.deleteUser(authId);
    throw new HttpError(500, "Could not upgrade your account. Please try again.");
  }
  return { email };
}
