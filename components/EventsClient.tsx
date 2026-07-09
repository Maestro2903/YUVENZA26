"use client";

import { useMemo, useState } from "react";
import { EVENTS, INR, type YuvenzaEvent } from "@/lib/events";

/**
 * Events page frontend: browse the fest line-up, add the entries you want and
 * "pay". The checkout is a UI-only demo (no real transaction) - wire a payment
 * provider to handlePay when the backend is ready.
 */
export default function EventsClient() {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paid, setPaid] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", college: "" });

  const chosen = useMemo(() => EVENTS.filter((e) => selected[e.id]), [selected]);
  const total = useMemo(() => chosen.reduce((s, e) => s + e.price, 0), [chosen]);
  const count = chosen.length;

  const toggle = (id: string) =>
    setSelected((s) => ({ ...s, [id]: !s[id] }));

  const openCheckout = () => {
    if (count === 0) return;
    setPaid(false);
    setCheckoutOpen(true);
  };

  const closeCheckout = () => setCheckoutOpen(false);

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    // Frontend-only: this is where a real payment call would go.
    setPaid(true);
  };

  const reset = () => {
    setSelected({});
    setForm({ name: "", email: "", phone: "", college: "" });
    setPaid(false);
    setCheckoutOpen(false);
  };

  return (
    <div className="ev">
      {/* Masthead */}
      <header className="ev-masthead">
        <div className="ev-kicker">
          <span>Registration · The Flagship Fest</span>
          <span>Feb 2026</span>
        </div>
        <h1 className="ev-h1">
          Regi<span className="f-span space">s</span>ter
        </h1>
        <p className="ev-lead">
          Pick the entries you want to be part of, then register in one go. Every entry fee
          flows straight into the community causes we back. What we create, we contribute.
        </p>
      </header>

      <div className="ev-layout">
        {/* Event grid */}
        <ol className="ev-grid">
          {EVENTS.map((ev) => (
            <EventCard
              key={ev.id}
              event={ev}
              selected={!!selected[ev.id]}
              onToggle={() => toggle(ev.id)}
            />
          ))}
        </ol>

        {/* Order summary */}
        <aside className="ev-summary" aria-label="Your registration">
          <div className="ev-summary-inner">
            <div className="ev-summary-head">
              <span className="ev-summary-title">Your Entries</span>
              <span className="ev-summary-count">{count}</span>
            </div>

            {count === 0 ? (
              <p className="ev-empty">No entries yet. Add the events you want to join.</p>
            ) : (
              <ul className="ev-summary-list">
                {chosen.map((e) => (
                  <li key={e.id} className="ev-summary-row">
                    <span className="ev-summary-name">{e.title}</span>
                    <span className="ev-summary-price">{INR(e.price)}</span>
                    <button
                      type="button"
                      className="ev-summary-remove"
                      aria-label={`Remove ${e.title}`}
                      onClick={() => toggle(e.id)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="ev-summary-total">
              <span>Total</span>
              <span className="ev-total-amt">{INR(total)}</span>
            </div>
            <button
              type="button"
              className="ev-checkout-btn"
              disabled={count === 0}
              onClick={openCheckout}
            >
              Proceed to Register
            </button>
            <p className="ev-summary-note">Fees fund our social initiatives.</p>
          </div>
        </aside>
      </div>

      {/* Mobile sticky bar */}
      <div className={"ev-bar" + (count > 0 ? " show" : "")}>
        <div className="ev-bar-info">
          <span className="ev-bar-count">
            {count} {count === 1 ? "entry" : "entries"}
          </span>
          <span className="ev-bar-total">{INR(total)}</span>
        </div>
        <button type="button" className="ev-bar-btn" onClick={openCheckout}>
          Register
        </button>
      </div>

      {/* Checkout modal */}
      {checkoutOpen && (
        <div className="ev-modal-overlay" role="dialog" aria-modal="true" onClick={closeCheckout}>
          <div className="ev-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="ev-modal-close"
              aria-label="Close"
              onClick={closeCheckout}
            >
              ×
            </button>

            {paid ? (
              <div className="ev-success">
                <div className="ev-success-mark">✓</div>
                <h2 className="ev-success-head">
                  You&#x27;re in<span className="f-span">!</span>
                </h2>
                <p className="ev-success-body">
                  {form.name ? `See you at the fest, ${form.name.split(" ")[0]}. ` : "See you at the fest. "}
                  A confirmation for {count} {count === 1 ? "entry" : "entries"} is on its way.
                </p>
                <button type="button" className="ev-pay-btn" onClick={reset}>
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="ev-modal-head">
                  <span className="ev-modal-kicker">Checkout</span>
                  <h2 className="ev-modal-title">
                    Regi<span className="f-span">s</span>ter
                  </h2>
                </div>

                <form className="ev-form" onSubmit={handlePay}>
                  <div className="ev-field">
                    <label htmlFor="ev-name">Full name</label>
                    <input
                      id="ev-name"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="ev-field-row">
                    <div className="ev-field">
                      <label htmlFor="ev-email">Email</label>
                      <input
                        id="ev-email"
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="you@email.com"
                      />
                    </div>
                    <div className="ev-field">
                      <label htmlFor="ev-phone">Phone</label>
                      <input
                        id="ev-phone"
                        type="tel"
                        required
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="10-digit number"
                      />
                    </div>
                  </div>
                  <div className="ev-field">
                    <label htmlFor="ev-college">College</label>
                    <input
                      id="ev-college"
                      value={form.college}
                      onChange={(e) => setForm({ ...form, college: e.target.value })}
                      placeholder="Institution name"
                    />
                  </div>

                  <div className="ev-order">
                    <span className="ev-order-title">Order</span>
                    {chosen.map((e) => (
                      <div key={e.id} className="ev-order-row">
                        <span>{e.title}</span>
                        <span>{INR(e.price)}</span>
                      </div>
                    ))}
                    <div className="ev-order-total">
                      <span>Total</span>
                      <span>{INR(total)}</span>
                    </div>
                  </div>

                  <button type="submit" className="ev-pay-btn">
                    Pay {INR(total)}
                  </button>
                  <p className="ev-modal-note">
                    Demo checkout, no real payment is taken. Registration is confirmed instantly.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EventCard({
  event,
  selected,
  onToggle,
}: {
  event: YuvenzaEvent;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <li className={"ev-card" + (selected ? " selected" : "")}>
      <div className="ev-card-top">
        <span className="ev-cat">{event.category}</span>
        {event.badge && <span className={"ev-badge " + event.badge.toLowerCase()}>{event.badge}</span>}
      </div>
      <h3 className="ev-title">{event.title}</h3>
      <p className="ev-desc">{event.desc}</p>
      <div className="ev-meta">
        <span className="ev-date">{event.date}</span>
        <span className="ev-slots">{event.slots}</span>
      </div>
      <div className="ev-card-foot">
        <span className="ev-price">{INR(event.price)}</span>
        <button
          type="button"
          className={"ev-add" + (selected ? " on" : "")}
          onClick={onToggle}
          aria-pressed={selected}
        >
          {selected ? "Added ✓" : "Add entry"}
        </button>
      </div>
    </li>
  );
}
