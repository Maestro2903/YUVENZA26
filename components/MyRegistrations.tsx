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
}: {
  user: SiteUser;
  events: EventItem[];
  /** Bump to refetch (e.g. right after a successful payment). */
  refreshToken?: number;
}) {
  const [orders, setOrders] = useState<OwnOrder[] | null>(null);
  const [openQr, setOpenQr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setOrders([]);
      return;
    }
    supabase
      .from("orders")
      .select("id, amount, status, demo, event_slugs, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn("[registrations] fetch failed:", error.message);
          setOrders([]);
          return;
        }
        setOrders((data as OwnOrder[]) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [user.id, refreshToken]);

  const titleFor = (slug: string) => events.find((e) => e.slug === slug)?.title ?? slug;

  if (orders === null || orders.length === 0) return null;

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
                    {order.event_slugs.map(titleFor).join(" · ")}
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
              {paid && openQr === order.id && <QrTicket orderId={order.id} name={user.name} />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
