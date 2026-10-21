/** Normalise Ghana numbers to the local 10-digit form: 0XXXXXXXXX. */
export function normalizePhone(raw: string): string {
  let cleaned = (raw || "").trim().replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+233")) {
    cleaned = "0" + cleaned.slice(4);
  } else if (cleaned.startsWith("233")) {
    cleaned = "0" + cleaned.slice(3);
  }
  return cleaned;
}

export function isValidGhanaPhone(phone: string): boolean {
  return /^0\d{9}$/.test(phone);
}

/**
 * Supabase Auth needs an email or E.164 phone; phone sign-in requires an SMS
 * provider, so each account gets a stable internal email derived from the number.
 */
export function phoneToAuthEmail(phone: string): string {
  return `${normalizePhone(phone)}@phone.betrix.app`;
}
