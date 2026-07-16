import { requirePermission, AuthorizationError } from "@/lib/rbac/guards";
import { getServerSupabase } from "@/lib/supabase/server";
import { getEvents } from "@/lib/content/queries";
import { csvResponse, toCsv } from "@/lib/csv";
import type { OrderStatus } from "@/lib/supabase/types";
import { sanitizeSearch, SLUG_FILTER_RE } from "@/app/(admin)/admin/actions/helpers";
import { fetchAllRows } from "@/lib/supabase/paginate";

export const dynamic = "force-dynamic";

const STATUSES = ["paid", "created", "pending", "failed", "cancelled"];
const MAX_ROWS = 10000;

/**
 * GET /admin/payments/export - CSV of orders honouring the same filters as
 * the Orders & payments page (q, status, event, checkin). Filter by an event
 * to download its attendee list. Requires payments.view.
 */
export async function GET(request: Request) {
  try {
    await requirePermission("payments.view");
  } catch (err) {
    const status = err instanceof AuthorizationError ? err.status : 403;
    return new Response("Forbidden", { status });
  }

  const supabase = await getServerSupabase();
  if (!supabase) return new Response("Not configured", { status: 503 });

  const params = new URL(request.url).searchParams;
  const q = sanitizeSearch(params.get("q") ?? "");
  const status = params.get("status") ?? "all";
  const eventRaw = params.get("event") ?? "";
  // Validated once; used for both the filter and the filename.
  const event = SLUG_FILTER_RE.test(eventRaw) ? eventRaw : "";
  const checkin = params.get("checkin") ?? "all";

  // NOTE: keep these filters in sync with the payments page.
  const buildQuery = () => {
    let query = supabase
      .from("orders")
      .select(
        "id, razorpay_order_id, amount, status, demo, customer_name, customer_email, customer_phone, customer_college, event_slugs, created_at, checked_in_at, confirmation_email_sent_at"
      );
    if (q) {
      query = query.or(
        `customer_email.ilike.%${q}%,customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%`
      );
    }
    if (STATUSES.includes(status)) query = query.eq("status", status as OrderStatus);
    if (event) query = query.contains("event_slugs", [event]);
    if (checkin === "in") query = query.not("checked_in_at", "is", null);
    if (checkin === "out") query = query.is("checked_in_at", null);
    return query.order("created_at", { ascending: false });
  };

  // Paged fetch: PostgREST silently caps single responses at the project's
  // Max Rows setting, so one big .limit() would drop rows without warning.
  const { rows, truncated, error } = await fetchAllRows(
    (f, t) => buildQuery().range(f, t),
    { maxRows: MAX_ROWS }
  );
  if (error) return new Response("Query failed", { status: 500 });

  const catalog = await getEvents();
  const titleFor = (slug: string) => catalog.find((e) => e.slug === slug)?.title ?? slug;

  const csv = toCsv(
    [
      "created_at",
      "name",
      "email",
      "phone",
      "college",
      "events",
      "amount_inr",
      "status",
      "demo",
      "checked_in_at",
      "email_sent_at",
      "order_id",
      "razorpay_order_id",
    ],
    rows.map((o) => [
      o.created_at,
      o.customer_name,
      o.customer_email,
      o.customer_phone,
      o.customer_college,
      o.event_slugs.map(titleFor).join("; "),
      Math.round(o.amount / 100),
      o.status,
      o.demo,
      o.checked_in_at,
      o.confirmation_email_sent_at,
      o.id,
      o.razorpay_order_id,
    ])
  );

  const body = truncated
    ? csv + `"WARNING: export capped at ${MAX_ROWS} rows - narrow the filters for the rest"\r\n`
    : csv;
  const stamp = new Date().toISOString().slice(0, 10);
  const suffix = event ? `-${event}` : "";
  return csvResponse(body, `yuvenza-orders${suffix}-${stamp}.csv`);
}
