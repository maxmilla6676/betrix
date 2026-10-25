/**
 * Central referral code capture and persistence for BETRIX.
 * Stores referral codes across localStorage, sessionStorage, and cookies
 * so partner attribution is never lost across navigation, reloads, or sessions.
 */

const STORAGE_KEY = "betrix.referral_code";
const COOKIE_NAME = "betrix_ref";

/**
 * Normalizes a referral code: trims whitespace, upper-cases.
 */
export function normalizeReferralCode(raw?: string | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  const clean = raw.trim().toUpperCase();
  if (clean.length < 2) return null;
  return clean;
}

/**
 * Stores a referral code persistently in localStorage, sessionStorage, and cookie (30 days).
 */
export function storeReferralCode(raw: string): string | null {
  const code = normalizeReferralCode(raw);
  if (!code) return null;

  try {
    if (typeof window !== "undefined") {
      window.localStorage?.setItem(STORAGE_KEY, code);
      window.sessionStorage?.setItem(STORAGE_KEY, code);

      // Set cookie for 30 days so server SSR / API requests can read it if needed
      const maxAge = 30 * 24 * 60 * 60; // 30 days in seconds
      document.cookie = `${COOKIE_NAME}=${encodeURIComponent(code)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    }
  } catch (err) {
    console.warn("[referral] could not write to storage:", err);
  }

  return code;
}

/**
 * Retrieves any stored referral code from URL query, localStorage, sessionStorage, or cookies.
 */
export function getStoredReferralCode(): string | null {
  if (typeof window === "undefined") return null;

  try {
    // 1. Check current URL query parameter (?ref= or ?referral=)
    const urlParams = new URLSearchParams(window.location.search);
    const urlRef = urlParams.get("ref") || urlParams.get("referral");
    if (urlRef) {
      const code = storeReferralCode(urlRef);
      if (code) return code;
    }

    // 2. Check localStorage
    const local = window.localStorage?.getItem(STORAGE_KEY);
    if (local) {
      const code = normalizeReferralCode(local);
      if (code) return code;
    }

    // 3. Check sessionStorage
    const session = window.sessionStorage?.getItem(STORAGE_KEY);
    if (session) {
      const code = normalizeReferralCode(session);
      if (code) return code;
    }

    // 4. Check cookies
    const cookieMatch = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
    if (cookieMatch && cookieMatch[1]) {
      const code = normalizeReferralCode(decodeURIComponent(cookieMatch[1]));
      if (code) return code;
    }
  } catch (err) {
    console.warn("[referral] error reading stored referral:", err);
  }

  return null;
}

/**
 * Clears stored referral codes upon completion or if explicitly requested.
 */
export function clearStoredReferralCode(): void {
  try {
    if (typeof window !== "undefined") {
      window.localStorage?.removeItem(STORAGE_KEY);
      window.sessionStorage?.removeItem(STORAGE_KEY);
      document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
    }
  } catch (err) {
    console.warn("[referral] error clearing storage:", err);
  }
}

/**
 * Extracts and persists referral code from URL if present.
 */
export function captureReferralFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const urlParams = new URLSearchParams(window.location.search);
  const ref = urlParams.get("ref") || urlParams.get("referral");
  if (ref) {
    return storeReferralCode(ref);
  }
  return null;
}
