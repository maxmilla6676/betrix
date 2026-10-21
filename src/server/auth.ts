import { adminDb } from "./db";
import { HttpError } from "./http";

export interface AuthedUser {
  authId: string;
  profileId: string;
  userId: string;
  phone: string;
  role: "USER" | "ADMIN" | "PARTNER";
}

/** Resolve the caller from the `Authorization: Bearer <supabase access token>` header. */
export async function requireUser(request: Request): Promise<AuthedUser> {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) throw new HttpError(401, "Please log in to continue.");

  const db = adminDb();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user)
    throw new HttpError(401, "Your session has expired. Please log in again.");

  const { data: profile } = await db
    .from("profiles")
    .select("id, user_id, phone, role")
    .eq("auth_id", data.user.id)
    .maybeSingle();
  if (!profile) throw new HttpError(401, "Account not found. Please log in again.");

  return {
    authId: data.user.id,
    profileId: profile.id,
    userId: profile.user_id,
    phone: profile.phone,
    role: String(profile.role || "USER").toUpperCase() as AuthedUser["role"],
  };
}

export async function requireAdmin(request: Request): Promise<AuthedUser> {
  const user = await requireUser(request);
  if (user.role !== "ADMIN") throw new HttpError(403, "Admin access required.");
  return user;
}
