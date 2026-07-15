import Link from "next/link";
import Flash from "@/components/admin/Flash";
import Pagination from "@/components/admin/Pagination";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { deleteEventAction, toggleEventPublishedAction } from "@/app/(admin)/admin/actions/content";
import LiveSlotCell from "@/components/admin/LiveSlotCell";
import { identityHasPermission, requirePagePermission } from "@/lib/rbac/guards";
import { getServerSupabase } from "@/lib/supabase/server";
import { INR } from "@/lib/content/types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function AdminEventsList({
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
    .from("events")
    .select("id, slug, title, category, date_label, price, capacity, published", { count: "exact" });
  if (q) query = query.or(`title.ilike.%${q}%,slug.ilike.%${q}%,category.ilike.%${q}%`);
  if (status === "published") query = query.eq("published", true);
  if (status === "draft") query = query.eq("published", false);

  const from = (page - 1) * PAGE_SIZE;
  const [{ data: rows, count, error }, { data: regRows }] = await Promise.all([
    query
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1),
    supabase.from("event_registrations").select("event_slug, registered"),
  ]);
  const regCounts = Object.fromEntries((regRows ?? []).map((r) => [r.event_slug, r.registered]));

  const canPublish = identityHasPermission(identity, "content.publish");
  const canDelete = identityHasPermission(identity, "content.delete");
  const canCreate = identityHasPermission(identity, "content.create");

  return (
    <>
      <header className="adm-header">
        <div>
          <h1 className="adm-title">Events</h1>
          <p className="adm-sub">The fest line-up shown on /registration and the home page.</p>
        </div>
        {canCreate && (
          <div className="adm-header-actions">
            <Link href="/admin/events/new" className="adm-btn">
              + New event
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
          <p className="adm-empty">
            No events match. {canCreate && <Link href="/admin/events/new">Create the first one →</Link>}
          </p>
        </div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Category</th>
                <th>Date</th>
                <th className="num">Fee</th>
                <th>Registered (live)</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <span className="adm-cell-main">{row.title}</span>
                    <span className="adm-cell-sub">{row.slug}</span>
                  </td>
                  <td>{row.category}</td>
                  <td>{row.date_label}</td>
                  <td className="num">{INR(row.price)}</td>
                  <td>
                    <LiveSlotCell
                      slug={row.slug}
                      capacity={row.capacity}
                      initialRegistered={regCounts[row.slug] ?? 0}
                    />
                  </td>
                  <td>
                    <span className={`adm-pill ${row.published ? "published" : "draft"}`}>
                      {row.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td>
                    <div className="adm-row-actions">
                      <Link href={`/admin/events/${row.id}`} className="adm-btn ghost small">
                        Edit
                      </Link>
                      {canPublish && (
                        <form action={toggleEventPublishedAction}>
                          <input type="hidden" name="id" value={row.id} />
                          <input type="hidden" name="publish" value={row.published ? "" : "on"} />
                          <button type="submit" className="adm-btn ghost small">
                            {row.published ? "Unpublish" : "Publish"}
                          </button>
                        </form>
                      )}
                      {canDelete && (
                        <form action={deleteEventAction}>
                          <input type="hidden" name="id" value={row.id} />
                          <ConfirmButton confirmText={`Delete "${row.title}"? Existing orders keep their records.`}>
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
        basePath="/admin/events"
        page={page}
        pageSize={PAGE_SIZE}
        total={count ?? 0}
        params={{ q, status }}
      />
    </>
  );
}
