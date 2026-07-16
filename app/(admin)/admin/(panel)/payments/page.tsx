import Link from "next/link";
import Flash from "@/components/admin/Flash";
import Pagination from "@/components/admin/Pagination";
import VerifyTicket from "@/components/admin/VerifyTicket";
import SubmitButton from "@/components/admin/SubmitButton";
import { resendConfirmationEmailAction } from "@/app/(admin)/admin/actions/payments";
import { identityHasPermission, requirePagePermission } from "@/lib/rbac/guards";
import { getServerSupabase } from "@/lib/supabase/server";
import { INR } from "@/lib/content/types";
import type { OrderStatus } from "@/lib/supabase/types";
import { sanitizeSearch, SLUG_FILTER_RE } from "@/app/(admin)/admin/actions/helpers";
import { fetchAllRows } from "@/lib/supabase/paginate";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;
const STATUSES = ["all", "paid", "created", "pending", "failed", "cancelled"] as const;

type Params = {
  q?: string;
  status?: string;
  event?: string;
  checkin?: string;
  page?: string;
  ok?: string;
  err?: string;
};

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const identity = await requirePagePermission("payments.view");
  const { q: qRaw = "", status = "all", event = "", checkin = "all", page: pageParam, ok, err } =
    await searchParams;
  const q = sanitizeSearch(qRaw);
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const supabase = await getServerSupabase();
  if (!supabase) return <p className="adm-flash err">Supabase is not configured.</p>;

  // Event options for the filter dropdown.
  const { data: eventRows } = await supabase
    .from("events")
    .select("slug, title")
    .order("sort_order", { ascending: true });
  const eventOptions = eventRows ?? [];

  // NOTE: keep these filters in sync with payments/export/route.ts.
  const applyFilters = <T,>(query: T): T => {
    let qb = query as unknown as {
      or: (f: string) => unknown;
      eq: (c: string, v: unknown) => unknown;
      contains: (c: string, v: unknown) => unknown;
      is: (c: string, v: null) => unknown;
      not: (c: string, op: string, v: unknown) => unknown;
    };
    if (q) qb = qb.or(`customer_email.ilike.%${q}%,customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%`) as typeof qb;
    if (status !== "all" && (STATUSES as readonly string[]).includes(status)) {
      qb = qb.eq("status", status as OrderStatus) as typeof qb;
    }
    if (event && SLUG_FILTER_RE.test(event)) {
      qb = qb.contains("event_slugs", [event]) as typeof qb;
    }
    if (checkin === "in") qb = qb.not("checked_in_at", "is", null) as typeof qb;
    if (checkin === "out") qb = qb.is("checked_in_at", null) as typeof qb;
    return qb as T;
  };

  const listQuery = applyFilters(
    supabase
      .from("orders")
      .select(
        "id, razorpay_order_id, amount, status, demo, customer_name, customer_email, customer_phone, customer_college, event_slugs, created_at, checked_in_at, confirmation_email_sent_at, payments ( razorpay_payment_id, status, method )",
        { count: "exact" }
      )
  );

  const from = (page - 1) * PAGE_SIZE;
  // Summary uses exact counts (immune to PostgREST's max-rows cap) plus a
  // paginated amounts fetch for revenue - see lib/supabase/paginate.ts.
  const [listRes, paidRes, checkedInRes, revenueRes] = await Promise.all([
    listQuery.order("created_at", { ascending: false }).range(from, from + PAGE_SIZE - 1),
    applyFilters(supabase.from("orders").select("*", { count: "exact", head: true })).eq(
      "status",
      "paid"
    ),
    applyFilters(supabase.from("orders").select("*", { count: "exact", head: true })).not(
      "checked_in_at",
      "is",
      null
    ),
    fetchAllRows<{ amount: number }>((f, t) =>
      applyFilters(supabase.from("orders").select("amount"))
        .eq("status", "paid")
        .eq("demo", false)
        .order("id", { ascending: true })
        .range(f, t)
    ),
  ]);
  const { data: rows, count, error } = listRes;

  const summary = {
    paid: paidRes.count ?? 0,
    checkedIn: checkedInRes.count ?? 0,
    revenuePaise: revenueRes.rows.reduce((sum, o) => sum + o.amount, 0),
    revenueTruncated: revenueRes.truncated,
  };

  const canManagePayments = identityHasPermission(identity, "payments.manage");
  const filterParams = { q, status, event, checkin };
  const exportHref = `/admin/payments/export?${new URLSearchParams(filterParams).toString()}`;

  return (
    <>
      <header className="adm-header">
        <div>
          <h1 className="adm-title">Orders &amp; payments</h1>
          <p className="adm-sub">
            Every registration, with its Razorpay payment trail. The webhook keeps statuses
            authoritative. The export honours the active filters - filter by an event to get its
            attendee list.
          </p>
        </div>
        <div className="adm-header-actions">
          <a href={exportHref} className="adm-btn ghost">
            ⬇ Export CSV
          </a>
          {canManagePayments && (
            <Link href="/admin/settings#payments" className="adm-btn ghost">
              Payment settings
            </Link>
          )}
        </div>
      </header>
      <Flash ok={ok} err={err ?? error?.message} />

      <VerifyTicket />

      <div className="adm-stats" style={{ marginTop: "1.25rem" }}>
        <div className="adm-stat">
          <span className="adm-stat-num">{count ?? 0}</span>
          <span className="adm-stat-label">Matching orders</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat-num">{summary.paid}</span>
          <span className="adm-stat-label">Paid</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat-num">
            {summary.revenuePaise === 0 ? "₹0" : INR(Math.round(summary.revenuePaise / 100))}
            {summary.revenueTruncated ? "+" : ""}
          </span>
          <span className="adm-stat-label">
            Revenue (filtered{summary.revenueTruncated ? ", first 10k orders" : ""})
          </span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat-num">{summary.checkedIn}</span>
          <span className="adm-stat-label">Checked in</span>
        </div>
      </div>

      <div className="adm-toolbar">
        <form method="get">
          <input type="search" name="q" placeholder="Search name, email, phone…" defaultValue={q} />
          <select name="status" defaultValue={status} aria-label="Filter by status">
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All statuses" : s}
              </option>
            ))}
          </select>
          <select name="event" defaultValue={event} aria-label="Filter by event">
            <option value="">All events</option>
            {eventOptions.map((e) => (
              <option key={e.slug} value={e.slug}>
                {e.title}
              </option>
            ))}
            {event && SLUG_FILTER_RE.test(event) && !eventOptions.some((e) => e.slug === event) && (
              <option value={event}>{event} (deleted event)</option>
            )}
          </select>
          <select name="checkin" defaultValue={checkin} aria-label="Filter by check-in">
            <option value="all">Check-in: all</option>
            <option value="in">Checked in</option>
            <option value="out">Not checked in</option>
          </select>
          <button type="submit" className="adm-btn ghost small">
            Filter
          </button>
        </form>
      </div>

      {!rows || rows.length === 0 ? (
        <div className="adm-card">
          <p className="adm-empty">No orders match.</p>
        </div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Entries</th>
                <th className="num">Amount</th>
                <th>Status</th>
                <th>Payment</th>
                <th>When</th>
                {canManagePayments && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const payment = Array.isArray(o.payments) ? o.payments[0] : o.payments;
                return (
                  <tr key={o.id}>
                    <td>
                      <span className="adm-cell-main">{o.customer_name}</span>
                      <span className="adm-cell-sub">
                        {o.customer_email} · {o.customer_phone}
                        {o.customer_college ? ` · ${o.customer_college}` : ""}
                      </span>
                    </td>
                    <td>{o.event_slugs.join(", ")}</td>
                    <td className="num">{o.amount === 0 ? "Free" : INR(Math.round(o.amount / 100))}</td>
                    <td>
                      <span className={`adm-pill ${o.status}`}>{o.status}</span>{" "}
                      {o.demo && <span className="adm-pill demo">demo</span>}{" "}
                      {o.checked_in_at && (
                        <span
                          className="adm-pill active"
                          title={new Date(o.checked_in_at).toLocaleString("en-IN")}
                        >
                          checked in
                        </span>
                      )}{" "}
                      {o.confirmation_email_sent_at && (
                        <span
                          className="adm-pill"
                          title={`Email sent ${new Date(o.confirmation_email_sent_at).toLocaleString("en-IN")}`}
                        >
                          ✉ emailed
                        </span>
                      )}
                    </td>
                    <td>
                      {payment ? (
                        <>
                          <span className={`adm-pill ${payment.status}`}>{payment.status}</span>
                          <span className="adm-cell-sub">
                            {payment.razorpay_payment_id ?? "—"}
                            {payment.method ? ` · ${payment.method}` : ""}
                          </span>
                        </>
                      ) : (
                        <span className="adm-cell-sub">—</span>
                      )}
                    </td>
                    <td>{new Date(o.created_at).toLocaleString("en-IN")}</td>
                    {canManagePayments && (
                      <td>
                        {o.status === "paid" && (
                          <form action={resendConfirmationEmailAction}>
                            <input type="hidden" name="order_id" value={o.id} />
                            <input
                              type="hidden"
                              name="back"
                              value={`/admin/payments?${new URLSearchParams({ ...filterParams, page: String(page) }).toString()}`}
                            />
                            <SubmitButton className="adm-btn ghost small" pendingLabel="Sending…">
                              Resend email
                            </SubmitButton>
                          </form>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        basePath="/admin/payments"
        page={page}
        pageSize={PAGE_SIZE}
        total={count ?? 0}
        params={filterParams}
      />
    </>
  );
}
