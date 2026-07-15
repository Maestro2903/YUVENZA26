import Link from "next/link";
import Flash from "@/components/admin/Flash";
import { getAdminIdentity, identityHasPermission } from "@/lib/rbac/guards";
import { getServerSupabase } from "@/lib/supabase/server";
import { INR } from "@/lib/content/types";

export const dynamic = "force-dynamic";

async function count(
  supabase: NonNullable<Awaited<ReturnType<typeof getServerSupabase>>>,
  table: "case_studies" | "events" | "orders" | "profiles" | "media"
): Promise<number | null> {
  const { count: n, error } = await supabase.from(table).select("*", { count: "exact", head: true });
  return error ? null : (n ?? 0);
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string; error?: string }>;
}) {
  const { ok, err, error } = await searchParams;
  const identity = await getAdminIdentity();
  const supabase = await getServerSupabase();
  const canSeePayments = identityHasPermission(identity, "payments.view");
  const canSeeContent = identityHasPermission(identity, "content.view");

  const stats: { label: string; value: string }[] = [];
  let recentOrders: {
    id: string;
    customer_name: string;
    customer_email: string;
    amount: number;
    status: string;
    demo: boolean;
    created_at: string;
  }[] = [];

  if (supabase) {
    // All dashboard queries fire concurrently - one network wait, not six.
    const [studies, events, media, paidOrdersRes, recentRes] = await Promise.all([
      canSeeContent ? count(supabase, "case_studies") : null,
      canSeeContent ? count(supabase, "events") : null,
      canSeeContent ? count(supabase, "media") : null,
      canSeePayments
        ? supabase.from("orders").select("amount, demo").eq("status", "paid")
        : null,
      canSeePayments
        ? supabase
            .from("orders")
            .select("id, customer_name, customer_email, amount, status, demo, created_at")
            .order("created_at", { ascending: false })
            .limit(6)
        : null,
    ]);

    if (canSeeContent) {
      stats.push(
        { label: "Case studies", value: String(studies ?? "—") },
        { label: "Events", value: String(events ?? "—") },
        { label: "Media files", value: String(media ?? "—") }
      );
    }
    if (canSeePayments) {
      const paidOrders = paidOrdersRes?.data ?? [];
      const revenuePaise = paidOrders.filter((o) => !o.demo).reduce((sum, o) => sum + o.amount, 0);
      const revenueRupees = Math.round(revenuePaise / 100);
      stats.push(
        { label: "Paid orders", value: String(paidOrders.length) },
        { label: "Revenue", value: revenueRupees === 0 ? "₹0" : INR(revenueRupees) }
      );
      recentOrders = recentRes?.data ?? [];
    }
  }

  return (
    <>
      <header className="adm-header">
        <div>
          <h1 className="adm-title">Dashboard</h1>
          <p className="adm-sub">
            Welcome back{identity?.fullName ? `, ${identity.fullName}` : ""}. Everything on the
            public site is managed from here.
          </p>
        </div>
      </header>
      <Flash ok={ok} err={err ?? (error === "forbidden" ? "You don't have access to that section." : undefined)} />

      {stats.length > 0 && (
        <div className="adm-stats">
          {stats.map((s) => (
            <div className="adm-stat" key={s.label}>
              <span className="adm-stat-num">{s.value}</span>
              <span className="adm-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {canSeePayments && (
        <section className="adm-card">
          <h2 className="adm-card-title">Recent orders</h2>
          {recentOrders.length === 0 ? (
            <p className="adm-empty">No orders yet.</p>
          ) : (
            <div className="adm-table-wrap" style={{ border: "none" }}>
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Status</th>
                    <th className="num">Amount</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <span className="adm-cell-main">{o.customer_name}</span>
                        <span className="adm-cell-sub">{o.customer_email}</span>
                      </td>
                      <td>
                        <span className={`adm-pill ${o.status}`}>{o.status}</span>{" "}
                        {o.demo && <span className="adm-pill demo">demo</span>}
                      </td>
                      <td className="num">{INR(Math.round(o.amount / 100))}</td>
                      <td>{new Date(o.created_at).toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p style={{ marginBottom: 0 }}>
            <Link href="/admin/payments" className="adm-btn ghost small">
              All orders →
            </Link>
          </p>
        </section>
      )}

      {!supabase && (
        <p className="adm-flash err">Supabase is not configured - see docs/SETUP.md.</p>
      )}
    </>
  );
}
