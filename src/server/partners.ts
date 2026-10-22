import { createClient } from "@supabase/supabase-js";
import { isValidGhanaPhone, normalizePhone, phoneToAuthEmail } from "@/lib/phone";
import { migrateLegacyAccount, registerAccount } from "./accounts";
import { adminDb } from "./db";
import { serverEnv } from "./env";
import { HttpError } from "./http";

const str = (v: unknown, max: number) =>
  String(v ?? "")
    .trim()
    .slice(0, max);

/** Check a phone/password pair without touching anyone's browser session. */
async function passwordMatches(phone: string, password: string) {
  const { supabaseUrl, supabaseAnonKey } = serverEnv();
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email: phoneToAuthEmail(phone),
    password,
  });
  // "local" ends only this check's session; the default ("global") would log the user out everywhere.
  if (data.session) await client.auth.signOut({ scope: "local" });
  return !error;
}

/**
 * Partner application. The applicant's phone + password become their login for
 * the partner dashboard: a new account is created for an unknown number, and an
 * existing account must prove the password (so nobody can apply with someone
 * else's number).
 */
export async function applyAsPartner(body: Record<string, unknown>) {
  const name = str(body["name"], 120);
  const email = str(body["email"], 200);
  const phone = normalizePhone(String(body["phone"] || ""));
  const password = String(body["password"] || "");
  const channel = str(body["channel"], 200);
  const audienceSize = str(body["audienceSize"], 60);

  if (name.length < 2) throw new HttpError(400, "Enter your full name or brand name.");
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, "Enter a valid email address.");
  if (!isValidGhanaPhone(phone)) {
    throw new HttpError(400, "Enter a valid Ghana phone number (e.g. 024 123 4567).");
  }
  if (password.length < 6) throw new HttpError(400, "Password must be at least 6 characters.");

  const db = adminDb();
  const { data: existing } = await db
    .from("partners")
    .select("id")
    .eq("phone", phone)
    .in("status", ["PENDING", "APPROVED"])
    .maybeSingle();
  if (existing)
    throw new HttpError(409, "A partner application already exists for this phone number.");

  const { data: profile } = await db
    .from("profiles")
    .select("auth_id")
    .eq("phone", phone)
    .maybeSingle();
  if (!profile) {
    await registerAccount({ phone, password });
  } else if (!profile.auth_id) {
    await migrateLegacyAccount({ phone, password }); // verifies the old password
  } else if (!(await passwordMatches(phone, password))) {
    throw new HttpError(
      401,
      "This number already has a BETRIX account and the password doesn't match. Use that account's password.",
    );
  }

  const { data: code, error } = await db.rpc("apply_partner", {
    p_name: name,
    p_email: email,
    p_phone: phone,
    p_channel: channel,
    p_audience_size: audienceSize,
    p_code: "",
  });
  if (error) {
    if (error.message.includes("PHONE_TAKEN")) {
      throw new HttpError(409, "A partner application already exists for this phone number.");
    }
    console.error("[partners] apply failed:", error.message);
    throw new HttpError(500, "Could not submit your application. Please try again.");
  }
  return { code: String(code), name, phone };
}
