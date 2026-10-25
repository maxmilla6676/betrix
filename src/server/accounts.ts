import crypto from "node:crypto";
import { isValidGhanaPhone, normalizePhone, phoneToAuthEmail } from "@/lib/phone";
import { adminDb } from "./db";
import { HttpError, dbError } from "./http";
import type { AuthedUser } from "./auth";

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
  const rawRef = String(body["referralCode"] || body["code"] || body["ref"] || body["referral"] || "")
    .trim()
    .toUpperCase();
  if (rawRef) {
    const rawClean = rawRef.replace(/^BTX-/, "");
    const { data: partner } = await db
      .from("partners")
      .select("id, code, signups")
      .or(`code.ilike.${rawRef},code.ilike.${rawClean},code.ilike.BTX-${rawClean}`)
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
  // `exists: false` lets the login screen say "no account" instead of "wrong password".
  if (!profile) return { email, exists: false };
  if (profile.auth_id) return { email, exists: true };

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
  return { email, exists: true };
}

/**
 * Links a partner referral code to an authenticated user's profile if not already attributed.
 */
export async function linkReferral(user: AuthedUser, body: Record<string, unknown>) {
  const rawCode = String(
    body["referralCode"] || body["code"] || body["ref"] || body["referral"] || "",
  ).trim();
  if (!rawCode) {
    throw new HttpError(400, "Missing referral code.");
  }
  const cleanCode = rawCode.toUpperCase();
  const rawClean = cleanCode.replace(/^BTX-/, "");

  const db = adminDb();
  const { data: profile } = await db
    .from("profiles")
    .select("id, phone, referred_by, has_deposited")
    .eq("id", user.profileId)
    .maybeSingle();

  if (!profile) {
    throw new HttpError(404, "User profile not found.");
  }

  // If already linked, return current link without re-attributing
  if (profile.referred_by) {
    return { ok: true, alreadyLinked: true, code: profile.referred_by };
  }

  // Find approved partner matching code with or without BTX- prefix
  const { data: partner } = await db
    .from("partners")
    .select("id, code, name, signups, active_users")
    .or(`code.ilike.${cleanCode},code.ilike.${rawClean},code.ilike.BTX-${rawClean}`)
    .eq("status", "APPROVED")
    .maybeSingle();

  if (!partner) {
    return { ok: false, error: "Invalid or inactive partner referral code." };
  }

  const { error: updateErr } = await db
    .from("profiles")
    .update({ referred_by: partner.code, updated_at: new Date().toISOString() })
    .eq("id", user.profileId);

  if (updateErr) {
    throw dbError(updateErr);
  }

  // Increment signups (and active_users if user has already made a deposit)
  await db
    .from("partners")
    .update({
      signups: (partner.signups || 0) + 1,
      active_users: (partner.active_users || 0) + (profile.has_deposited ? 1 : 0),
    })
    .eq("id", partner.id);

  return {
    ok: true,
    linked: true,
    partnerCode: partner.code,
    partnerName: partner.name,
  };
}

