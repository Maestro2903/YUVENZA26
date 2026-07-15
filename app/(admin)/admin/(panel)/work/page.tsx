import Link from "next/link";
import Flash from "@/components/admin/Flash";
import Pagination from "@/components/admin/Pagination";
import ConfirmButton from "@/components/admin/ConfirmButton";
import {
  deleteCaseStudyAction,
  toggleCaseStudyPublishedAction,
} from "@/app/(admin)/admin/actions/content";
import { identityHasPermission, requirePagePermission } from "@/lib/rbac/guards";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function AdminWorkList({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; ok?: string; err?: string }>;
}) {
  const identity = await requirePagePermission("content.view");
  const { q = "", status = "all", page: pageParam, ok, err } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const supabase = await getServerSupabase();
  if (!supabase) return <p className="adm-flash err">Supabase is not configured.</p>;

  let query = supabase
    .from("case_studies")
    .select("id, slug, title, category, year, published, sort_order, updated_at", {
      count: "exact",
    });
  if (q) query = query.or(`title.ilike.%${q}%,slug.ilike.%${q}%,category.ilike.%${q}%`);
  if (status === "published") query = query.eq("published", true);
  if (status === "draft") query = query.eq("published", false);

  const from = (page - 1) * PAGE_SIZE;
  const { data: rows, count, error } = await query
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .range(from, from + PAGE_SIZE - 1);

  const canPublish = identityHasPermission(identity, "content.publish");
  const canDelete = identityHasPermission(identity, "content.delete");
  const canCreate = identityHasPermission(identity, "content.create");

  return (
    <>
      <header className="adm-header">
        <div>
          <h1 className="adm-title">Work / Case studies</h1>
          <p className="adm-sub">The initiatives shown on the home rail and under /work.</p>
        </div>
        {canCreate && (
          <div className="adm-header-actions">
            <Link href="/admin/work/new" className="adm-btn">
              + New case study
            </Link>
          </div>
        )}
      </header>
      <Flash ok={ok} err={err ?? error?.message} />

      <div className="adm-toolbar">
        <form method="get">
          <input type="search" name="q" placeholder="Search title, slug, category…" defaultValue={q} />
          <select name="status" defaultValue={status} aria-label="Filter by status">
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
          <button type="submit" className="adm-btn ghost small">
            Filter
          </button>
        </form>
      </div>

      {!rows || rows.length === 0 ? (
        <div className="adm-card">
          <p className="adm-empty">No case studies match. {canCreate && <Link href="/admin/work/new">Create the first one →</Link>}</p>
        </div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Year</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <span className="adm-cell-main">{row.title}</span>
                    <span className="adm-cell-sub">/{row.slug}</span>
                  </td>
                  <td>{row.category}</td>
                  <td>{row.year}</td>
                  <td>
                    <span className={`adm-pill ${row.published ? "published" : "draft"}`}>
                      {row.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td>
                    <div className="adm-row-actions">
                      <Link href={`/admin/work/${row.id}`} className="adm-btn ghost small">
                        Edit
                      </Link>
                      {canPublish && (
                        <form action={toggleCaseStudyPublishedAction}>
                          <input type="hidden" name="id" value={row.id} />
                          <input type="hidden" name="publish" value={row.published ? "" : "on"} />
                          <button type="submit" className="adm-btn ghost small">
                            {row.published ? "Unpublish" : "Publish"}
                          </button>
                        </form>
                      )}
                      {canDelete && (
                        <form action={deleteCaseStudyAction}>
                          <input type="hidden" name="id" value={row.id} />
                          <ConfirmButton confirmText={`Delete "${row.title}"? This cannot be undone.`}>
                            Delete
                          </ConfirmButton>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        basePath="/admin/work"
        page={page}
        pageSize={PAGE_SIZE}
        total={count ?? 0}
        params={{ q, status }}
      />
    </>
  );
}
