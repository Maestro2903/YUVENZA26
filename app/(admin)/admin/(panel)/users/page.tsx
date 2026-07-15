import Flash from "@/components/admin/Flash";
import SubmitButton from "@/components/admin/SubmitButton";
import {
  createUserAction,
  toggleUserActiveAction,
  updateUserRoleAction,
} from "@/app/(admin)/admin/actions/users";
import { isSuperAdmin, requirePagePermission } from "@/lib/rbac/guards";
import { SUPER_ADMIN_ROLE } from "@/lib/rbac/permissions";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const identity = await requirePagePermission("users.manage");
  const { ok, err } = await searchParams;

  const supabase = await getServerSupabase();
  if (!supabase) return <p className="adm-flash err">Supabase is not configured.</p>;

  const [{ data: profiles }, { data: roles }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, is_active, created_at, role_id, roles ( id, name )")
      .order("created_at", { ascending: true }),
    supabase.from("roles").select("id, name").order("name"),
  ]);

  const superAdmin = isSuperAdmin(identity);
  const assignableRoles = (roles ?? []).filter((r) => superAdmin || r.name !== SUPER_ADMIN_ROLE);

  return (
    <>
      <header className="adm-header">
        <div>
          <h1 className="adm-title">Users</h1>
          <p className="adm-sub">
            Admin-panel accounts. Only super admins can grant or revoke the super_admin role.
          </p>
        </div>
      </header>
      <Flash ok={ok} err={err} />

      <div className="adm-card">
        <h2 className="adm-card-title">Invite a new user</h2>
        <form action={createUserAction} className="adm-form">
          <div className="adm-field-row">
            <div className="adm-field">
              <label htmlFor="nu-email">Email *</label>
              <input id="nu-email" name="email" type="email" required />
            </div>
            <div className="adm-field">
              <label htmlFor="nu-name">Full name</label>
              <input id="nu-name" name="full_name" maxLength={120} />
            </div>
          </div>
          <div className="adm-field-row">
            <div className="adm-field">
              <label htmlFor="nu-pass">Temporary password *</label>
              <input id="nu-pass" name="password" type="password" required minLength={10} autoComplete="new-password" />
              <p className="adm-help">At least 10 characters. Share it securely; they can change it later.</p>
            </div>
            <div className="adm-field">
              <label htmlFor="nu-role">Role *</label>
              <select id="nu-role" name="role_id" required defaultValue="">
                <option value="" disabled>
                  Choose a role…
                </option>
                {assignableRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="adm-form-actions">
            <SubmitButton pendingLabel="Creating…">Create user</SubmitButton>
          </div>
        </form>
      </div>

      <div className="adm-table-wrap" style={{ marginTop: "1.25rem" }}>
        <table className="adm-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((p) => {
              const role = Array.isArray(p.roles) ? p.roles[0] : p.roles;
              const isSelf = p.id === identity.userId;
              const targetIsSuper = role?.name === SUPER_ADMIN_ROLE;
              const canEditTarget = !isSelf && (superAdmin || !targetIsSuper);
              return (
                <tr key={p.id}>
                  <td>
                    <span className="adm-cell-main">
                      {p.full_name || p.email}
                      {isSelf && " (you)"}
                    </span>
                    <span className="adm-cell-sub">{p.email}</span>
                  </td>
                  <td>
                    {canEditTarget ? (
                      <form action={updateUserRoleAction} style={{ display: "flex", gap: "0.4rem" }}>
                        <input type="hidden" name="user_id" value={p.id} />
                        <select name="role_id" defaultValue={role?.id ?? ""} aria-label={`Role for ${p.email}`}>
                          <option value="" disabled>
                            No role
                          </option>
                          {assignableRoles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                        <SubmitButton className="adm-btn ghost small" pendingLabel="…">
                          Set
                        </SubmitButton>
                      </form>
                    ) : (
                      <span className="adm-pill">{role?.name ?? "no role"}</span>
                    )}
                  </td>
                  <td>
                    <span className={`adm-pill ${p.is_active ? "active" : "inactive"}`}>
                      {p.is_active ? "Active" : "Deactivated"}
                    </span>
                  </td>
                  <td>{new Date(p.created_at).toLocaleDateString("en-IN")}</td>
                  <td>
                    {canEditTarget && (
                      <form action={toggleUserActiveAction}>
                        <input type="hidden" name="user_id" value={p.id} />
                        <input type="hidden" name="active" value={p.is_active ? "" : "on"} />
                        <button
                          type="submit"
                          className={`adm-btn small ${p.is_active ? "danger" : "ghost"}`}
                        >
                          {p.is_active ? "Deactivate" : "Reactivate"}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
