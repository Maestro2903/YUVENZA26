import "server-only";

/**
 * Server-side authentication + authorization guards for the admin panel.
 *
 * Every server action and admin page calls one of these before doing work -
 * the UI hiding a button is never the only line of defence. Database RLS
 * policies (supabase/migrations) mirror these checks as the final layer.
 */
import { cache } from "react";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  roleHasPermission,
  SUPER_ADMIN_ROLE,
  type PermissionKey,
} from "@/lib/rbac/permissions";

export type AdminIdentity = {
  userId: string;
  email: string;
  fullName: string | null;
  role: { id: string; name: string; description: string | null; permissions: string[] } | null;
  isActive: boolean;
};

export class AuthorizationError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.name = "AuthorizationError";
    this.status = status;
  }
}

/**
 * Cross-request identity cache, keyed by access token, 30s TTL.
 *
 * Why this is safe: this identity only gates what the UI *offers* (nav items,
 * buttons, page access). Every actual read/write goes to Postgres with the
 * user's JWT where RLS policies + triggers re-check permissions from the live
 * tables - a stale cache entry can never grant real access, it can only show
 * a section that will refuse to act. Worst case after a role change or
 * deactivation: the old UI lingers for up to 30 seconds.
 */
const IDENTITY_TTL_MS = 30_000;
const IDENTITY_CACHE_MAX = 500;
const identityCache = new Map<string, { identity: AdminIdentity; expiresAt: number }>();

function readIdentityCache(token: string): AdminIdentity | null {
  const hit = identityCache.get(token);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    identityCache.delete(token);
    return null;
  }
  return hit.identity;
}

function writeIdentityCache(token: string, identity: AdminIdentity): void {
  if (identityCache.size >= IDENTITY_CACHE_MAX) {
    const oldest = identityCache.keys().next().value;
    if (oldest) identityCache.delete(oldest);
  }
  identityCache.set(token, { identity, expiresAt: Date.now() + IDENTITY_TTL_MS });
}

/**
 * Load the signed-in user's profile, role and permissions for this request.
 * Cached per-request so layout + page + actions share one lookup.
 * Returns null when unauthenticated or Supabase is not configured.
 *
 * Latency-tuned to ONE network round trip: the session is read locally from
 * the cookie (no auth-server call), and profile + role + permissions come
 * back in a single joined query. Security note: the cookie payload is NOT
 * the trust anchor here - the joined query carries the JWT to PostgREST,
 * which verifies its signature before RLS lets any row out. A forged or
 * expired token therefore produces no profile, which callers treat as
 * unauthenticated. Everything sensitive (role, permissions, active flag)
 * comes from the database row, never from raw claims.
 */
export const getAdminIdentity = cache(async (): Promise<AdminIdentity | null> => {
  const supabase = await getServerSupabase();
  if (!supabase) return null;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const userId = session.user.id;
  const email = session.user.email ?? "";

  const cached = readIdentityCache(session.access_token);
  if (cached) return cached;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, email, full_name, is_active, roles ( id, name, description, role_permissions ( permission_key ) )"
    )
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    return { userId, email, fullName: null, role: null, isActive: false };
  }

  const roleRecord = Array.isArray(profile.roles) ? profile.roles[0] : profile.roles;
  const grants = roleRecord?.role_permissions;
  const permissions = Array.isArray(grants) ? grants.map((g) => g.permission_key) : [];

  const identity: AdminIdentity = {
    userId: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    isActive: profile.is_active,
    role: roleRecord
      ? {
          id: roleRecord.id,
          name: roleRecord.name,
          description: roleRecord.description,
          permissions,
        }
      : null,
  };
  writeIdentityCache(session.access_token, identity);
  return identity;
});

export function identityHasPermission(
  identity: AdminIdentity | null,
  permission: PermissionKey
): boolean {
  if (!identity || !identity.isActive) return false;
  return roleHasPermission(identity.role, permission);
}

export function isSuperAdmin(identity: AdminIdentity | null): boolean {
  return Boolean(identity?.isActive && identity.role?.name === SUPER_ADMIN_ROLE);
}

/** Redirect-based guard for admin pages. */
export async function requireAdminUser(): Promise<AdminIdentity> {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin/login");
  if (!identity.isActive) redirect("/admin/login?error=inactive");
  // Visitors who signed in with Google on the public site have a profile but
  // NO role - they are site users, not admins. Send them to the website
  // (not the login page: middleware bounces signed-in users back to /admin,
  // which would loop).
  if (!identity.role) redirect("/");
  return identity;
}

/** Redirect-based guard for admin pages that need a specific permission. */
export async function requirePagePermission(permission: PermissionKey): Promise<AdminIdentity> {
  const identity = await requireAdminUser();
  if (!identityHasPermission(identity, permission)) redirect("/admin?error=forbidden");
  return identity;
}

/** Throwing guard for server actions and API routes. */
export async function requirePermission(permission: PermissionKey): Promise<AdminIdentity> {
  const identity = await getAdminIdentity();
  if (!identity) throw new AuthorizationError("Not signed in", 401);
  if (!identity.isActive) throw new AuthorizationError("Account is deactivated", 403);
  if (!identityHasPermission(identity, permission)) {
    throw new AuthorizationError(`Missing permission: ${permission}`, 403);
  }
  return identity;
}

export async function requireSuperAdmin(): Promise<AdminIdentity> {
  const identity = await getAdminIdentity();
  if (!identity) throw new AuthorizationError("Not signed in", 401);
  if (!isSuperAdmin(identity)) throw new AuthorizationError("Super admin only", 403);
  return identity;
}
