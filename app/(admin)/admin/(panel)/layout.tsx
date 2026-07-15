import AdminNav, { type NavItem } from "@/components/admin/AdminNav";
import { signOutAction } from "@/app/(admin)/admin/actions/auth";
import {
  identityHasPermission,
  requireAdminUser,
} from "@/lib/rbac/guards";
import type { PermissionKey } from "@/lib/rbac/permissions";

export const dynamic = "force-dynamic";

const NAV: { href: string; label: string; group?: string; permission?: PermissionKey }[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/work", label: "Work / Case studies", group: "Content", permission: "content.view" },
  { href: "/admin/events", label: "Events", group: "Content", permission: "content.view" },
  { href: "/admin/content", label: "Site sections", group: "Content", permission: "content.view" },
  { href: "/admin/media", label: "Media library", group: "Content", permission: "media.view" },
  { href: "/admin/payments", label: "Orders & payments", group: "Payments", permission: "payments.view" },
  { href: "/admin/users", label: "Users", group: "Administration", permission: "users.manage" },
  { href: "/admin/roles", label: "Roles & permissions", group: "Administration", permission: "roles.manage" },
  { href: "/admin/settings", label: "Settings", group: "Administration", permission: "settings.manage" },
];

/**
 * Authenticated admin chrome. requireAdminUser() redirects unauthenticated
 * visitors; each page then enforces its own permission (requirePagePermission)
 * and every server action re-checks before writing. The sidebar only shows
 * sections the current role can open.
 */
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const identity = await requireAdminUser();

  const items: NavItem[] = NAV.filter(
    (item) => !item.permission || identityHasPermission(identity, item.permission)
  ).map(({ href, label, group }) => ({ href, label, group }));

  return (
    <div className="adm">
      <aside className="adm-sidebar">
        <div className="adm-brand">
          <span className="adm-brand-name">Yuvenza</span>
          <span className="adm-brand-sub">Admin panel</span>
        </div>
        <AdminNav items={items} />
        <div className="adm-user">
          <span className="adm-user-email">{identity.fullName || identity.email}</span>
          <span className="adm-user-role">{identity.role?.name ?? "no role"}</span>
          <div className="adm-user-actions">
            <a href="/" className="adm-btn ghost small">
              View site ↗
            </a>
            <form action={signOutAction}>
              <button type="submit" className="adm-btn ghost small">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main className="adm-main">{children}</main>
    </div>
  );
}
