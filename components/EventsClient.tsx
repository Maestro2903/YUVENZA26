"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { track } from "@vercel/analytics";
import { INR, type EventItem } from "@/lib/content/types";
import { useSupabaseUser } from "@/lib/hooks/useSupabaseUser";
import { normalizeDomain } from "@/lib/auth/allowedDomain";
import { findClash, formatTimeRange } from "@/lib/events/clash";
import { isSoldOut, slotsLabel } from "@/lib/events/capacity";
import { useLiveSlots } from "@/lib/hooks/useLiveSlots";
import MyRegistrations from "@/components/MyRegistrations";

/**
 * Events page frontend: sign in with a college Google account, browse the
 * fest line-up, add entries and register. Paid orders go through Razorpay
 * Checkout (order created and signature verified server-side); free orders
 * and the no-gateway demo mode are confirmed directly. The cart persists in
 * localStorage so it survives the Google OAuth redirect.
 */

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayCheckout = {
  open: () => void;
  on: (event: string, handler: (resp: unknown) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayCheckout;
  }
}

const CHECKOUT_JS = "https://checkout.razorpay.com/v1/checkout.js";
const CART_KEY = "yv26-cart";

/** Load Razorpay's checkout.js once, on demand. */
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_JS}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = CHECKOUT_JS;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.86c2.26-2.09 3.58-5.16 3.58-8.81z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.86-3c-1.07.72-2.44 1.15-4.08 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.37-2.28v-3.1H1.29a12 12 0 0 0 0 10.77l3.98-3.11z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.6 4.59 1.79l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.61l3.98 3.11C6.22 6.88 8.87 4.77 12 4.77z" />
    </svg>
  );
}

type Phase = "idle" | "signin" | "submitting" | "gateway" | "verifying";
type Result =
  | { kind: "cancelled" }
  | { kind: "error"; message: string }
  | null;

export default function EventsClient({
  events,
  festName = "The Flagship Fest",
  festDateLabel = "Aug 2026",
  paymentsLive = false,
  requireLogin = true,
  allowedEmailDomain = "citchennai.net",
  initialSlotCounts = {},
  closesAt = "",
}: {
  events: EventItem[];
  festName?: string;
  festDateLabel?: string;
  paymentsLive?: boolean;
  requireLogin?: boolean;
  allowedEmailDomain?: string;
  /** Server-rendered paid-registration counts; kept live via Realtime. */
  initialSlotCounts?: Record<string, number>;
  /** ISO datetime after which checkout refuses registrations ("" = never). */
  closesAt?: string;
}) {
  const { user, loading: authLoading, signInWithGoogle, signOut } = useSupabaseUser();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<Result>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", college: "" });

  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const slotCounts = useLiveSlots(initialSlotCounts);
  const closesTime = closesAt ? new Date(closesAt).getTime() : NaN;
  const registrationClosed = !Number.isNaN(closesTime) && Date.now() > closesTime;
  const domain = normalizeDomain(allowedEmailDomain);
  const mustSignIn = requireLogin && !user;

  const chosen = useMemo(() => events.filter((e) => selected[e.slug]), [events, selected]);
  const total = useMemo(() => chosen.reduce((s, e) => s + e.price, 0), [chosen]);
  const count = chosen.length;
  const busy = phase !== "idle";

  // ---- Cart persistence: survive the Google OAuth redirect ----
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]") as string[];
      if (Array.isArray(saved) && saved.length > 0) {
        const valid = new Set(events.map((e) => e.slug));
        setSelected(Object.fromEntries(saved.filter((s) => valid.has(s)).map((s) => [s, true])));
      }
    } catch {
      // corrupted storage - start fresh
    }
    // Surface ?authError=... from the OAuth callback, then clean the URL.
    const params = new URLSearchParams(window.location.search);
    const err = params.get("authError");
    if (err) {
      setAuthError(err);
      params.delete("authError");
      const qs = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(chosen.map((e) => e.slug)));
    } catch {
      // storage unavailable (private mode) - cart just won't survive redirects
    }
  }, [chosen]);

  // Prefill the form from the Google account.
  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      name: f.name || user.name,
      email: user.email,
    }));
  }, [user]);

  const toggle = (slug: string) => {
    const event = events.find((e) => e.slug === slug);
    // Never allow selecting a sold-out entry or one that clashes with an
    // already-chosen event - the buttons are disabled too; this guards
    // keyboard/programmatic paths.
    if (event && !selected[slug] && (findClash(event, chosen) || isSoldOut(event, slotCounts[slug]))) return;
    setSelected((s) => ({ ...s, [slug]: !s[slug] }));
  };

  const startSignIn = async () => {
    track("Sign In Started");
    setAuthError(null);
    setPhase("signin");
    const error = await signInWithGoogle(domain);
    if (error) {
      setPhase("idle");
      setAuthError(error);
    }
    // On success the browser navigates away to Google.
  };

  const openCheckout = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (count === 0) return;
    if (mustSignIn) {
      void startSignIn();
      return;
    }
    triggerRef.current = e.currentTarget;
    track("Checkout Opened", { entries: count, totalRupees: total });
    setResult(null);
    setCheckoutOpen(true);
  };

  const closeCheckout = useCallback(() => {
    if (busy) return; // don't close mid-payment
    setCheckoutOpen(false);
    triggerRef.current?.focus();
  }, [busy]);

  // Modal accessibility: Escape closes, focus moves in on open.
  useEffect(() => {
    if (!checkoutOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCheckout();
    };
    document.addEventListener("keydown", onKeyDown);
    const focusable = modalRef.current?.querySelector<HTMLElement>("input:not([disabled]), button");
    focusable?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [checkoutOpen, closeCheckout]);

  async function markCancelled(orderId: string, failed: boolean) {
    try {
      await fetch("/api/checkout/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, failed }),
      });
    } catch {
      // best-effort; the webhook reconciles authoritative status
    }
  }

  const succeed = (mode: "razorpay" | "free" | "demo", orderId: string) => {
    track("Registration Completed", { mode, entries: count, totalRupees: total });
    try {
      localStorage.removeItem(CART_KEY);
    } catch {
      /* ignore */
    }
    // Confirmed registrations live on the profile page (pass, QR, PDF).
    // Full document navigation on purpose - vendor scripts re-init per load.
    window.location.assign(`/profile?paid=${encodeURIComponent(orderId)}`);
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setResult(null);
    setPhase("submitting");

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          college: form.college,
          eventSlugs: chosen.map((c) => c.slug),
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setPhase("idle");
        setResult({
          kind: "error",
          message: data?.error ?? "Something went wrong. Please try again.",
        });
        return;
      }

      if (data.mode === "free" || data.mode === "demo") {
        succeed(data.mode, data.orderId ?? "");
        return;
      }

      // Live Razorpay flow
      setPhase("gateway");
      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        await markCancelled(data.orderId, true);
        setPhase("idle");
        setResult({
          kind: "error",
          message: "Could not load the payment window. Check your connection and try again.",
        });
        return;
      }

      const rzp = new window.Razorpay({
        key: data.keyId,
        order_id: data.razorpayOrderId,
        amount: data.amount,
        currency: data.currency,
        name: "Yuvenza",
        description: `${festName} · ${count} ${count === 1 ? "entry" : "entries"}`,
        prefill: { name: form.name, email: form.email, contact: form.phone },
        notes: { college: form.college },
        theme: { color: "#1d1d1b" },
        modal: {
          ondismiss: () => {
            track("Payment Cancelled", { totalRupees: total });
            void markCancelled(data.orderId, false);
            setPhase("idle");
            setResult({ kind: "cancelled" });
          },
        },
        handler: async (resp: RazorpayResponse) => {
          setPhase("verifying");
          try {
            const verifyRes = await fetch("/api/checkout/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: data.orderId,
                razorpayOrderId: resp.razorpay_order_id,
                razorpayPaymentId: resp.razorpay_payment_id,
                signature: resp.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json().catch(() => null);
            if (verifyRes.ok && verifyData?.ok) {
              succeed("razorpay", data.orderId);
            } else {
              setPhase("idle");
              setResult({
                kind: "error",
                message:
                  verifyData?.error ??
                  "We could not verify the payment. If you were charged, contact us with your payment id.",
              });
            }
          } catch {
            setPhase("idle");
            setResult({
              kind: "error",
              message:
                "Network error while confirming the payment. If you were charged, your registration is safe - we reconcile automatically.",
            });
          }
        },
      });

      rzp.on("payment.failed", () => {
        track("Payment Failed", { totalRupees: total });
        void markCancelled(data.orderId, true);
        setPhase("idle");
        setResult({
          kind: "error",
          message: "The payment failed. No money was captured - please try again.",
        });
      });

      rzp.open();
    } catch {
      setPhase("idle");
      setResult({ kind: "error", message: "Network error. Please try again." });
    }
  };

  return (
    <div className="ev">
      {/* Masthead */}
      <header className="ev-masthead">
        <div className="ev-kicker">
          <span>Registration · {festName}</span>
          <span>{festDateLabel}</span>
        </div>
        <h1 className="ev-h1">
          Regi<span className="f-span space">s</span>ter
        </h1>
        <p className="ev-lead">
          Pick the entries you want to be part of, then register in one go. Every entry fee
          flows straight into the community causes we back. What we create, we contribute.
        </p>

        {closesAt && !Number.isNaN(closesTime) && (
          <p className={"ev-status" + (registrationClosed ? " error" : "")} role="status">
            {registrationClosed
              ? "Registration has closed. See you at the fest!"
              : `Registration closes ${new Date(closesTime).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}.`}
          </p>
        )}

        {/* ---- Visitor account (Google) ---- */}
        {!authLoading && (
          <div className="ev-auth">
            {user ? (
              <div className="ev-user">
                {user.avatarUrl ? (
                   
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="ev-user-avatar"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="ev-user-avatar ev-user-initial" aria-hidden="true">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="ev-user-info">
                  <span className="ev-user-name">{user.name}</span>
                  <span className="ev-user-email">{user.email}</span>
                </span>
                <a href="/profile" className="ev-user-signout" aria-label="Open your profile">
                  Profile
                </a>
                <button type="button" className="ev-user-signout" onClick={() => void signOut()}>
                  Sign out
                </button>
              </div>
            ) : (
              <div className="ev-signin-row">
                <button
                  type="button"
                  className="ev-signin-btn"
                  onClick={() => void startSignIn()}
                  disabled={phase === "signin"}
                >
                  <GoogleMark />
                  {phase === "signin" ? "Opening Google…" : "Sign in with Google"}
                </button>
                {requireLogin && (
                  <span className="ev-signin-note">
                    {domain === "*"
                      ? "Sign in to register and get your entry pass."
                      : `Use your @${domain} account to register.`}
                  </span>
                )}
              </div>
            )}
            {authError && (
              <p className="ev-status error" role="alert">
                {authError}
              </p>
            )}
          </div>
        )}
      </header>

      {/* ---- Previous registrations + entry passes ---- */}
      {user && <MyRegistrations user={user} events={events} />}

      <div className="ev-layout">
        {/* Event grid */}
        <ol className="ev-grid">
          {events.map((ev) => (
            <EventCard
              key={ev.slug}
              event={ev}
              selected={!!selected[ev.slug]}
              clashWith={!selected[ev.slug] ? findClash(ev, chosen)?.title ?? null : null}
              registered={slotCounts[ev.slug]}
              onToggle={() => toggle(ev.slug)}
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
                  <li key={e.slug} className="ev-summary-row">
                    <span className="ev-summary-name">{e.title}</span>
                    <span className="ev-summary-price">{INR(e.price)}</span>
                    <button
                      type="button"
                      className="ev-summary-remove"
                      aria-label={`Remove ${e.title}`}
                      onClick={() => toggle(e.slug)}
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
              disabled={count === 0 || registrationClosed}
              onClick={openCheckout}
            >
              {mustSignIn ? "Sign in to register" : "Proceed to Register"}
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
          {mustSignIn ? "Sign in" : "Register"}
        </button>
      </div>

      {/* Checkout modal - portaled to <body>: the vendor smooth-scroll
          transforms #app, which turns position: fixed inside it into
          absolute (the modal would sit at the scroll offset and clip). */}
      {checkoutOpen &&
        createPortal(
        <div
          className="ev-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ev-modal-title"
          onClick={closeCheckout}
        >
          <div className="ev-modal" ref={modalRef} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="ev-modal-close"
              aria-label="Close"
              onClick={closeCheckout}
              disabled={busy}
            >
              ×
            </button>

                <div className="ev-modal-head">
                  <span className="ev-modal-kicker">Checkout</span>
                  <h2 className="ev-modal-title" id="ev-modal-title">
                    Regi<span className="f-span">s</span>ter
                  </h2>
                </div>

                <form className="ev-form" onSubmit={handlePay}>
                  <div className="ev-field">
                    <label htmlFor="ev-name">Full name</label>
                    <input
                      id="ev-name"
                      required
                      minLength={2}
                      maxLength={120}
                      autoComplete="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Your name"
                      disabled={busy}
                    />
                  </div>
                  <div className="ev-field-row">
                    <div className="ev-field">
                      <label htmlFor="ev-email">Email</label>
                      <input
                        id="ev-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="you@email.com"
                        disabled={busy || (requireLogin && !!user)}
                        readOnly={requireLogin && !!user}
                      />
                      {requireLogin && user && (
                        <span className="ev-field-hint">Your Google account email is used.</span>
                      )}
                    </div>
                    <div className="ev-field">
                      <label htmlFor="ev-phone">Phone</label>
                      <input
                        id="ev-phone"
                        type="tel"
                        required
                        inputMode="numeric"
                        pattern="[0-9]{10}"
                        maxLength={10}
                        title="10-digit mobile number"
                        autoComplete="tel-national"
                        value={form.phone}
                        onChange={(e) =>
                          setForm({ ...form, phone: e.target.value.replace(/[^0-9]/g, "") })
                        }
                        placeholder="10-digit number"
                        disabled={busy}
                      />
                    </div>
                  </div>
                  <div className="ev-field">
                    <label htmlFor="ev-college">College</label>
                    <input
                      id="ev-college"
                      maxLength={200}
                      autoComplete="organization"
                      value={form.college}
                      onChange={(e) => setForm({ ...form, college: e.target.value })}
                      placeholder="Institution name"
                      disabled={busy}
                    />
                  </div>

                  <div className="ev-order">
                    <span className="ev-order-title">Order</span>
                    {chosen.map((e) => (
                      <div key={e.slug} className="ev-order-row">
                        <span>{e.title}</span>
                        <span>{INR(e.price)}</span>
                      </div>
                    ))}
                    <div className="ev-order-total">
                      <span>Total</span>
                      <span>{INR(total)}</span>
                    </div>
                  </div>

                  {result?.kind === "error" && (
                    <p className="ev-status error" role="alert">
                      {result.message}
                    </p>
                  )}
                  {result?.kind === "cancelled" && (
                    <p className="ev-status" role="status">
                      Payment cancelled - nothing was charged. You can try again whenever
                      you&#x27;re ready.
                    </p>
                  )}

                  <button type="submit" className="ev-pay-btn" disabled={busy}>
                    {phase === "submitting"
                      ? "Starting…"
                      : phase === "gateway"
                        ? "Opening payment…"
                        : phase === "verifying"
                          ? "Confirming payment…"
                          : total === 0
                            ? "Register free"
                            : `Pay ${INR(total)}`}
                  </button>
                  <p className="ev-modal-note">
                    {paymentsLive
                      ? "Secure payment via Razorpay. Your entry pass appears on your profile right after."
                      : "Demo checkout - no real payment is taken. Your pass appears on your profile."}
                  </p>
                </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function EventCard({
  event,
  selected,
  clashWith,
  registered,
  onToggle,
}: {
  event: EventItem;
  selected: boolean;
  /** Title of an already-selected event this one clashes with, if any. */
  clashWith?: string | null;
  /** Live paid-registration count (Realtime). */
  registered?: number;
  onToggle: () => void;
}) {
  const timeRange = formatTimeRange(event.startTime, event.endTime);
  const soldOut = isSoldOut(event, registered) && !selected;
  const blocked = (Boolean(clashWith) || soldOut) && !selected;

  return (
    <li className={"ev-card" + (selected ? " selected" : "") + (blocked ? " clashed" : "")}>
      <div className="ev-card-top">
        <span className="ev-cat">{event.category}</span>
        {event.badge && <span className={"ev-badge " + event.badge.toLowerCase()}>{event.badge}</span>}
      </div>
      <h3 className="ev-title">{event.title}</h3>
      <p className="ev-desc">{event.description}</p>
      <div className="ev-meta">
        <span className="ev-date">
          {event.dateLabel}
          {timeRange && <span className="ev-time"> · {timeRange}</span>}
        </span>
        <span className={"ev-slots" + (soldOut ? " out" : "")}>{slotsLabel(event, registered)}</span>
      </div>
      {blocked && (
        <p className="ev-clash" role="status">
          Clashes with {clashWith} - remove it to pick this one.
        </p>
      )}
      <div className="ev-card-foot">
        <span className="ev-price">{INR(event.price)}</span>
        <button
          type="button"
          className={"ev-add" + (selected ? " on" : "")}
          onClick={onToggle}
          aria-pressed={selected}
          disabled={blocked}
          title={soldOut ? "No slots left" : blocked ? `Clashes with ${clashWith}` : undefined}
        >
          {selected ? "Added ✓\uFE0E" : soldOut ? "Sold out" : blocked ? "Time clash" : "Add entry"}
        </button>
      </div>
    </li>
  );
}
