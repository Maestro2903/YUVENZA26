import { requirePermission, AuthorizationError } from "@/lib/rbac/guards";
import { getServerSupabase } from "@/lib/supabase/server";
import { csvResponse, toCsv } from "@/lib/csv";
import { sanitizeSearch, UUID_RE } from "@/app/(admin)/admin/actions/helpers";
import { fetchAllRows } from "@/lib/supabase/paginate";

export const dynamic = "force-dynamic";

const MAX_ROWS = 10000;

/**
 * GET /admin/users/export - CSV of user accounts honouring the same filters
 * as the Users page (q, role). Requires users.manage.
 */
export async function GET(request: Request) {
  try {
    await requirePermission("users.manage");
  } catch (err) {
    const status = err instanceof AuthorizationError ? err.status : 403;
    return new Response("Forbidden", { status });
  }

  const supabase = await getServerSupabase();
  if (!supabase) return new Response("Not configured", { status: 503 });

  const params = new URL(request.url).searchParams;
  const q = sanitizeSearch(params.get("q") ?? "");
  const roleFilter = params.get("role") ?? "";

  // NOTE: keep these filters in sync with the users page.
  const buildQuery = () => {
    let query = supabase
      .from("profiles")
      .select("email, full_name, is_active, created_at, role_id, roles ( name )");
    if (q) query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`);
    if (roleFilter === "none") {
      query = query.is("role_id", null);
    } else if (UUID_RE.test(roleFilter)) {
      query = query.eq("role_id", roleFilter);
    }
    return query.order("created_at", { ascending: true });
  };

  const { rows, truncated, error } = await fetchAllRows(
    (f, t) => buildQuery().range(f, t),
    { maxRows: MAX_ROWS }
  );
  if (error) return new Response("Query failed", { status: 500 });

  const csv = toCsv(
    ["email", "full_name", "role", "active", "joined_at"],
    rows.map((p) => {
      const role = Array.isArray(p.roles) ? p.roles[0] : p.roles;
      return [p.email, p.full_name, role?.name ?? "", p.is_active, p.created_at];
    })
  );

  const body = truncated
    ? csv + `"WARNING: export capped at ${MAX_ROWS} rows - narrow the filters for the rest"\r\n`
    : csv;
  const stamp = new Date().toISOString().slice(0, 10);
  return csvResponse(body, `yuvenza-users-${stamp}.csv`);
}
