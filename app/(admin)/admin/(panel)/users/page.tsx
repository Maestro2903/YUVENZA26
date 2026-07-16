import Flash from "@/components/admin/Flash";
import Pagination from "@/components/admin/Pagination";
import SubmitButton from "@/components/admin/SubmitButton";
import {
  createUserAction,
  toggleUserActiveAction,
  updateUserRoleAction,
} from "@/app/(admin)/admin/actions/users";
import { isSuperAdmin, requirePagePermission } from "@/lib/rbac/guards";
import { SUPER_ADMIN_ROLE } from "@/lib/rbac/permissions";
import { getServerSupabase } from "@/lib/supabase/server";
import { sanitizeSearch, UUID_RE } from "@/app/(admin)/admin/actions/helpers";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; page?: string; ok?: string; err?: string }>;
}) {
  const identity = await requirePagePermission("users.manage");
  const { q: qRaw = "", role: roleFilter = "", page: pageParam, ok, err } = await searchParams;
  const q = sanitizeSearch(qRaw);
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const supabase = await getServerSupabase();
  if (!supabase) return <p className="adm-flash err">Supabase is not configured.</p>;

  const { data: roles } = await supabase.from("roles").select("id, name").order("name");
  const roleList = roles ?? [];

  let query = supabase
    .from("profiles")
    .select("id, email, full_name, is_active, created_at, role_id, roles ( id, name )", {
      count: "exact",
    });
  if (q) query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`);
  if (roleFilter === "none") {
    query = query.is("role_id", null);
  } else if (UUID_RE.test(roleFilter)) {
    // Shape check (matches the export route) rather than table membership,
    // so a deleted role's bookmark filters to an empty list on BOTH paths
    // instead of the page silently showing everyone.
    query = query.eq("role_id", roleFilter);
  }

  const from = (page - 1) * PAGE_SIZE;
  const { data: profiles, count, error } = await query
    .order("created_at", { ascending: true })
    .range(from, from + PAGE_SIZE - 1);

  const superAdmin = isSuperAdmin(identity);
  const assignableRoles = roleList.filter((r) => superAdmin || r.name !== SUPER_ADMIN_ROLE);
  const filterParams = { q, role: roleFilter };
  const exportHref = `/admin/users/export?${new URLSearchParams(filterParams).toString()}`;

  return (
    <>
      <header className="adm-header">
        <div>
          <h1 className="adm-title">Users</h1>
          <p className="adm-sub">
            All accounts - admin-panel staff AND visitors who signed in with Google to register
            (they have no role and no admin access). Only super admins can grant or revoke
            super_admin.
          </p>
        </div>
        <div className="adm-header-actions">
          <a href={exportHref} className="adm-btn ghost">
            ⬇ Export CSV
          </a>
        </div>
      </header>
      <Flash ok={ok} err={err ?? error?.message} />

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

      <div className="adm-toolbar" style={{ marginTop: "1.25rem" }}>
        <form method="get">
          <input type="search" name="q" placeholder="Search email or name…" defaultValue={q} />
          <select name="role" defaultValue={roleFilter} aria-label="Filter by role">
            <option value="">All roles</option>
            <option value="none">No role (visitors)</option>
            {roleList.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
            {UUID_RE.test(roleFilter) && !roleList.some((r) => r.id === roleFilter) && (
              <option value={roleFilter}>(deleted role)</option>
            )}
          </select>
          <button type="submit" className="adm-btn ghost small">
            Filter
          </button>
        </form>
      </div>

      {!profiles || profiles.length === 0 ? (
        <div className="adm-card">
          <p className="adm-empty">No users match.</p>
        </div>
      ) : (
        <div className="adm-table-wrap">
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
              {profiles.map((p) => {
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
      )}

      <Pagination
        basePath="/admin/users"
        page={page}
        pageSize={PAGE_SIZE}
        total={count ?? 0}
        params={filterParams}
      />
    </>
  );
}
