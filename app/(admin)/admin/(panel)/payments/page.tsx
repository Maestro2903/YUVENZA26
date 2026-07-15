import Link from "next/link";
import Flash from "@/components/admin/Flash";
import Pagination from "@/components/admin/Pagination";
import VerifyTicket from "@/components/admin/VerifyTicket";
import { identityHasPermission, requirePagePermission } from "@/lib/rbac/guards";
import { getServerSupabase } from "@/lib/supabase/server";
import { INR } from "@/lib/content/types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;
const STATUSES = ["all", "paid", "created", "pending", "failed", "cancelled"] as const;

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; ok?: string; err?: string }>;
}) {
  const identity = await requirePagePermission("payments.view");
  const { q = "", status = "all", page: pageParam, ok, err } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const supabase = await getServerSupabase();
  if (!supabase) return <p className="adm-flash err">Supabase is not configured.</p>;

  let query = supabase
    .from("orders")
    .select(
      "id, razorpay_order_id, amount, status, demo, customer_name, customer_email, customer_phone, customer_college, event_slugs, created_at, payments ( razorpay_payment_id, status, method )",
      { count: "exact" }
    );
  if (q) query = query.or(`customer_email.ilike.%${q}%,customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%`);
  if (status !== "all" && (STATUSES as readonly string[]).includes(status)) {
    query = query.eq("status", status as import("@/lib/supabase/types").OrderStatus);
  }

  const from = (page - 1) * PAGE_SIZE;
  const { data: rows, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const canManagePayments = identityHasPermission(identity, "payments.manage");

  return (
    <>
      <header className="adm-header">
        <div>
          <h1 className="adm-title">Orders &amp; payments</h1>
          <p className="adm-sub">
            Every registration, with its Razorpay payment trail. The webhook keeps statuses
            authoritative.
          </p>
        </div>
        {canManagePayments && (
          <div className="adm-header-actions">
            <Link href="/admin/settings#payments" className="adm-btn ghost">
              Payment settings
            </Link>
          </div>
        )}
      </header>
      <Flash ok={ok} err={err ?? error?.message} />

      <VerifyTicket />

      <div className="adm-toolbar" style={{ marginTop: "1.25rem" }}>
        <form method="get">
          <input type="search" name="q" placeholder="Search name, email, phone…" defaultValue={q} />
          <select name="status" defaultValue={status} aria-label="Filter by status">
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All statuses" : s}
              </option>
            ))}
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
                      {o.demo && <span className="adm-pill demo">demo</span>}
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
        params={{ q, status }}
      />
    </>
  );
}
