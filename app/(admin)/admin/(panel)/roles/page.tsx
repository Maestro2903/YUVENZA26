import Flash from "@/components/admin/Flash";
import SubmitButton from "@/components/admin/SubmitButton";
import ConfirmButton from "@/components/admin/ConfirmButton";
import {
  createRoleAction,
  deleteRoleAction,
  updateRolePermissionsAction,
} from "@/app/(admin)/admin/actions/roles";
import { requirePagePermission } from "@/lib/rbac/guards";
import {
  PERMISSIONS,
  PERMISSION_CATEGORIES,
  SUPER_ADMIN_ROLE,
  type PermissionKey,
} from "@/lib/rbac/permissions";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminRolesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  await requirePagePermission("roles.manage");
  const { ok, err } = await searchParams;

  const supabase = await getServerSupabase();
  if (!supabase) return <p className="adm-flash err">Supabase is not configured.</p>;

  const [{ data: roles }, { data: rolePerms }] = await Promise.all([
    supabase.from("roles").select("id, name, description, is_system").order("created_at"),
    supabase.from("role_permissions").select("role_id, permission_key"),
  ]);

  const permsByRole = new Map<string, Set<string>>();
  for (const rp of rolePerms ?? []) {
    if (!permsByRole.has(rp.role_id)) permsByRole.set(rp.role_id, new Set());
    permsByRole.get(rp.role_id)!.add(rp.permission_key);
  }

  const permissionEntries = Object.entries(PERMISSIONS) as [
    PermissionKey,
    (typeof PERMISSIONS)[PermissionKey],
  ][];

  return (
    <>
      <header className="adm-header">
        <div>
          <h1 className="adm-title">Roles &amp; permissions</h1>
          <p className="adm-sub">
            Super-admin only. Toggle what each role can do; changes apply immediately, both in the
            UI and in the database policies.
          </p>
        </div>
      </header>
      <Flash ok={ok} err={err} />

      <div className="adm-card">
        <h2 className="adm-card-title">Create a role</h2>
        <form action={createRoleAction} className="adm-form">
          <div className="adm-field-row">
            <div className="adm-field">
              <label htmlFor="nr-name">Role name *</label>
              <input id="nr-name" name="name" required maxLength={40} placeholder="event_manager" />
            </div>
            <div className="adm-field">
              <label htmlFor="nr-desc">Description</label>
              <input id="nr-desc" name="description" maxLength={200} />
            </div>
          </div>
          <div className="adm-form-actions">
            <SubmitButton pendingLabel="Creating…">Create role</SubmitButton>
          </div>
        </form>
      </div>

      {(roles ?? []).map((role) => {
        const granted = permsByRole.get(role.id) ?? new Set<string>();
        const isSuper = role.name === SUPER_ADMIN_ROLE;
        return (
          <div className="adm-card" key={role.id}>
            <h2 className="adm-card-title">
              {role.name}{" "}
              {role.is_system && <span className="adm-pill">built-in</span>}
            </h2>
            {isSuper ? (
              <p className="adm-help">
                {role.description} The super_admin role implicitly holds every permission,
                including any added in the future - it can&#x27;t be edited or deleted.
              </p>
            ) : (
              <form action={updateRolePermissionsAction} className="adm-form" style={{ maxWidth: "none" }}>
                <input type="hidden" name="role_id" value={role.id} />
                <div className="adm-field">
                  <label htmlFor={`rd-${role.id}`}>Description</label>
                  <input id={`rd-${role.id}`} name="description" defaultValue={role.description ?? ""} maxLength={200} />
                </div>
                <div className="adm-checks">
                  {PERMISSION_CATEGORIES.map((category) => (
                    <span key={category} style={{ display: "contents" }}>
                      <div className="adm-checks-group">{category}</div>
                      {permissionEntries
                        .filter(([, meta]) => meta.category === category)
                        .map(([key, meta]) => (
                          <label className="adm-check" key={key}>
                            <input type="checkbox" name="perm" value={key} defaultChecked={granted.has(key)} />
                            {meta.label}
                          </label>
                        ))}
                    </span>
                  ))}
                </div>
                <div className="adm-form-actions">
                  <SubmitButton>Save permissions</SubmitButton>
                </div>
              </form>
            )}
            {!role.is_system && (
              <form action={deleteRoleAction} style={{ marginTop: "0.75rem" }}>
                <input type="hidden" name="role_id" value={role.id} />
                <ConfirmButton confirmText={`Delete role "${role.name}"? Users holding it lose admin access until reassigned.`}>
                  Delete role
                </ConfirmButton>
              </form>
            )}
          </div>
        );
      })}
    </>
  );
}
