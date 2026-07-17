"use client";

/**
 * "My registrations" - the signed-in visitor's own orders, fetched directly
 * from Supabase in the browser. The orders_select_own RLS policy guarantees
 * a user can only ever read rows where user_id = their auth id.
 * Paid orders expand into the QR entry pass.
 */
import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { INR, type EventItem } from "@/lib/content/types";
import type { SiteUser } from "@/lib/hooks/useSupabaseUser";
import QrTicket from "@/components/QrTicket";

type OwnOrder = {
  id: string;
  amount: number;
  status: string;
  demo: boolean;
  event_slugs: string[];
  created_at: string;
};

export default function MyRegistrations({
  user,
  events,
  refreshToken = 0,
  showEmpty = false,
  autoOpenOrder,
}: {
  user: SiteUser;
  events: EventItem[];
  /** Bump to refetch (e.g. right after a successful payment). */
  refreshToken?: number;
  /** Render a friendly empty state instead of nothing (profile page). */
  showEmpty?: boolean;
  /** Order id whose QR pass starts expanded (post-checkout landing). */
  autoOpenOrder?: string;
}) {
  const [orders, setOrders] = useState<OwnOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [openQr, setOpenQr] = useState<string | null>(autoOpenOrder ?? null);

  useEffect(() => {
    let cancelled = false;
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setOrders([]);
      return;
    }
    setError(null);
    supabase
      .from("orders")
      .select("id, amount, status, demo, event_slugs, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError) {
          // NEVER render this the same as "no registrations" - a paid student
          // on flaky venue Wi-Fi would conclude their order is lost and pay
          // again.
          console.warn("[registrations] fetch failed:", fetchError.message);
          setError("Couldn't load your registrations - check your connection.");
          return;
        }
        setOrders((data as OwnOrder[]) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [user.id, refreshToken, retry]);

  // Post-checkout landing: expand the fresh order's pass once we know its id.
  useEffect(() => {
    if (autoOpenOrder) setOpenQr(autoOpenOrder);
  }, [autoOpenOrder]);

  const titleFor = (slug: string) => events.find((e) => e.slug === slug)?.title ?? slug;

  if (error) {
    return (
      <section className="ev-myregs" aria-label="Your registrations">
        <p className="ev-status error" role="alert">
          {error}{" "}
          <button type="button" className="ev-myregs-qrbtn" onClick={() => setRetry((n) => n + 1)}>
            Retry
          </button>
        </p>
      </section>
    );
  }
  if (orders === null) {
    return (
      <section className="ev-myregs" aria-label="Your registrations">
        <p className="ev-qr-caption">Loading your registrations…</p>
      </section>
    );
  }
  if (orders.length === 0) {
    if (!showEmpty) return null;
    return (
      <section className="ev-myregs" aria-label="Your registrations">
        <div className="ev-myregs-head">
          <span className="ev-myregs-title">Your registrations</span>
          <span className="ev-myregs-count">0</span>
        </div>
        <p className="ev-qr-caption pf-empty">
          Nothing here yet. Pick your entries on the events page and your passes will show up
          here, ready to scan at the gate.
        </p>
      </section>
    );
  }

  return (
    <section className="ev-myregs" aria-label="Your registrations">
      <div className="ev-myregs-head">
        <span className="ev-myregs-title">Your registrations</span>
        <span className="ev-myregs-count">{orders.length}</span>
      </div>
      <ul className="ev-myregs-list">
        {orders.map((order) => {
          const paid = order.status === "paid";
          return (
            <li key={order.id} className="ev-myregs-item">
              <div className="ev-myregs-row">
                <div className="ev-myregs-info">
                  <span className="ev-myregs-events">
                    {order.event_slugs.map((slug, i) => (
                      <span key={slug}>
                        {i > 0 && " · "}
                        <a
                          href={`/events/${slug}`}
                          className="ev-myregs-link"
                          title={`${titleFor(slug)} - details & rules`}
                        >
                          {titleFor(slug)}
                        </a>
                      </span>
                    ))}
                  </span>
                  <span className="ev-myregs-meta">
                    {new Date(order.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {" · "}
                    {order.amount === 0 ? "Free" : INR(Math.round(order.amount / 100))}
                    {order.demo ? " · demo" : ""}
                  </span>
                </div>
                <div className="ev-myregs-actions">
                  <span className={`ev-myregs-status ${order.status}`}>
                    {paid ? "Confirmed" : order.status}
                  </span>
                  {paid && (
                    <button
                      type="button"
                      className="ev-myregs-qrbtn"
                      onClick={() => setOpenQr(openQr === order.id ? null : order.id)}
                      aria-expanded={openQr === order.id}
                    >
                      {openQr === order.id ? "Hide pass" : "Entry pass"}
                    </button>
                  )}
                </div>
              </div>
              {paid && openQr === order.id && <QrTicket orderId={order.id} />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
