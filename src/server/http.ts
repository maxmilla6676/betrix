/** Small helpers shared by the /api/* server routes. Server-only. */

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public extra?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
  });
}

/** Friendly messages for exceptions raised by the database money functions. */
const DB_ERRORS: Record<string, [number, string]> = {
  INSUFFICIENT_BALANCE: [400, "Insufficient balance."],
  INVALID_STAKE: [400, "Invalid stake."],
  INVALID_AMOUNT: [400, "Invalid amount."],
  WITHDRAWAL_IN_PROGRESS: [409, "You already have a withdrawal in progress."],
  AMOUNT_MISMATCH: [409, "Payment amount does not match the deposit request."],
  UNKNOWN_REFERENCE: [404, "Payment not found."],
  UNKNOWN_PROFILE: [404, "Account not found."],
  FORBIDDEN: [403, "Not allowed."],
};

export function dbError(error: { message?: string } | null | undefined): HttpError {
  const msg = error?.message || "";
  for (const [code, [status, text]] of Object.entries(DB_ERRORS)) {
    if (msg.includes(code)) return new HttpError(status, text, { code });
  }
  console.error("[db]", msg);
  return new HttpError(500, "Something went wrong. Please try again.");
}

/** Wrap a handler so thrown HttpErrors become JSON responses and nothing else leaks. */
export function handle(fn: (ctx: { request: Request }) => Promise<Response>) {
  return async (ctx: { request: Request }) => {
    try {
      return await fn(ctx);
    } catch (err) {
      if (err instanceof HttpError) {
        return json({ error: err.message, ...(err.extra || {}) }, err.status);
      }
      console.error("[api] unhandled error:", err);
      return json({ error: "Something went wrong. Please try again." }, 500);
    }
  };
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    throw new HttpError(400, "Invalid JSON body.");
  }
}

const buckets = new Map<string, { count: number; resetAt: number }>();

/**
 * Best-effort fixed-window rate limit. State is per server instance, so this
 * slows down abuse rather than guaranteeing a global limit.
 */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  b.count++;
  if (b.count > limit) {
    throw new HttpError(429, "Too many attempts. Please wait a few minutes and try again.");
  }
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
