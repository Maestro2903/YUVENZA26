import VerifyTicket from "@/components/admin/VerifyTicket";
import { requirePagePermission } from "@/lib/rbac/guards";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Stripped-down gate check-in station (phone-first). Needs only the
 * checkin.verify permission - create a "gate_staff" role with just that in
 * Admin -> Roles & permissions, and volunteers can scan passes without ever
 * seeing revenue, exports or attendee lists.
 */
export default async function AdminCheckinPage() {
  await requirePagePermission("checkin.verify");

  const supabase = await getServerSupabase();
  if (!supabase) return <p className="adm-flash err">Supabase is not configured.</p>;

  const [{ data: events }, { data: checkinRows }] = await Promise.all([
    supabase
      .from("events")
      .select("slug, title")
      .order("sort_order", { ascending: true }),
    supabase.from("order_checkins").select("event_slug"),
  ]);

  const counts = (checkinRows ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.event_slug] = (acc[r.event_slug] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <header className="adm-header">
        <div>
          <h1 className="adm-title">Gate check-in</h1>
          <p className="adm-sub">
            Pick this gate&#x27;s event, open the camera and scan. Green beep = in, amber = already
            scanned here, low buzz = not valid.
          </p>
        </div>
      </header>

      <div className="adm-card">
        <VerifyTicket events={events ?? []} compact />
      </div>

      {events && events.length > 0 && (
        <div className="adm-card">
          <h2 className="adm-card-title">Checked in so far (at page load)</h2>
          <div className="adm-stats" style={{ marginBottom: 0 }}>
            {events.map((e) => (
              <div className="adm-stat" key={e.slug}>
                <span className="adm-stat-num">{counts[e.slug] ?? 0}</span>
                <span className="adm-stat-label">{e.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
