/**
 * The RBAC permission catalog. This file is the single source of truth for
 * permission keys - the database seed (supabase/seed.sql), the RLS helper
 * `public.has_permission()`, the server guards and the admin UI all use these
 * keys. Add a new permission here first, then re-seed / migrate.
 */

export const PERMISSIONS = {
  // Content: case studies, events, editable site sections
  "content.view": { label: "View content", category: "Content" },
  "content.create": { label: "Create content", category: "Content" },
  "content.edit": { label: "Edit content", category: "Content" },
  "content.delete": { label: "Delete content", category: "Content" },
  "content.publish": { label: "Publish / unpublish content", category: "Content" },
  // Media library (Supabase Storage)
  "media.view": { label: "View media library", category: "Media" },
  "media.upload": { label: "Upload / replace media", category: "Media" },
  "media.delete": { label: "Delete media", category: "Media" },
  // Payments & registrations
  "payments.view": { label: "View orders & payments", category: "Payments" },
  "payments.manage": { label: "Manage payment configuration", category: "Payments" },
  // Administration
  "users.manage": { label: "Manage users", category: "Administration" },
  "roles.manage": { label: "Manage roles & permissions", category: "Administration" },
  "settings.manage": { label: "Manage site settings", category: "Administration" },
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export const ALL_PERMISSION_KEYS = Object.keys(PERMISSIONS) as PermissionKey[];

export const PERMISSION_CATEGORIES = [...new Set(Object.values(PERMISSIONS).map((p) => p.category))];

/** Role name with implicit access to everything, enforced in SQL and here. */
export const SUPER_ADMIN_ROLE = "super_admin";

/**
 * Default roles. `super_admin` bypasses permission checks entirely (both in
 * `public.has_permission()` and in `roleHasPermission` below), so its list is
 * informational; the others get exactly the listed permissions.
 */
export const DEFAULT_ROLES: {
  name: string;
  description: string;
  permissions: PermissionKey[];
}[] = [
  {
    name: SUPER_ADMIN_ROLE,
    description: "Full access to every feature, setting, user, role and permission.",
    permissions: ALL_PERMISSION_KEYS,
  },
  {
    name: "admin",
    description: "Manages content, media, users and payments. Cannot change roles or payment credentials.",
    permissions: [
      "content.view",
      "content.create",
      "content.edit",
      "content.delete",
      "content.publish",
      "media.view",
      "media.upload",
      "media.delete",
      "payments.view",
      "users.manage",
      "settings.manage",
    ],
  },
  {
    name: "editor",
    description: "Creates and edits content and media. Cannot publish, delete or administer.",
    permissions: ["content.view", "content.create", "content.edit", "media.view", "media.upload"],
  },
  {
    name: "viewer",
    description: "Read-only access to the admin panel.",
    permissions: ["content.view", "media.view", "payments.view"],
  },
];

/** Pure permission check used by UI + guards once role/permissions are loaded. */
export function roleHasPermission(
  role: { name: string; permissions: string[] } | null | undefined,
  permission: PermissionKey
): boolean {
  if (!role) return false;
  if (role.name === SUPER_ADMIN_ROLE) return true;
  return role.permissions.includes(permission);
}

export function isValidPermissionKey(key: string): key is PermissionKey {
  return key in PERMISSIONS;
}
