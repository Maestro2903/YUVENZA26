"use client";

/**
 * Check-in tool: paste (or scan with a keyboard-wedge QR scanner into) the
 * pass payload and verify it. Valid passes show the attendee's details and
 * registered events straight from the database.
 */
import { useActionState } from "react";
import {
  verifyTicketAction,
  type VerifyTicketState,
} from "@/app/(admin)/admin/actions/tickets";
import { INR } from "@/lib/content/types";

const INITIAL: VerifyTicketState = { checked: false, valid: false, message: "" };

export default function VerifyTicket() {
  const [state, formAction, pending] = useActionState<VerifyTicketState, FormData>(
    verifyTicketAction,
    INITIAL
  );

  return (
    <div className="adm-card">
      <h2 className="adm-card-title">Verify entry pass</h2>
      <form action={formAction} className="adm-form" style={{ maxWidth: "none" }}>
        <div className="adm-field">
          <label htmlFor="vt-payload">Scanned QR text</label>
          <input
            id="vt-payload"
            name="payload"
            className="adm-input"
            placeholder="YUV26|v1|…  (click here, then scan)"
            autoComplete="off"
            spellCheck={false}
          />
          <p className="adm-help">
            Point a QR scanner here (they type the decoded text), or paste it manually. Passes
            are cryptographically signed - anything not issued by this site is rejected.
          </p>
        </div>
        <div className="adm-form-actions">
          <button type="submit" className="adm-btn" disabled={pending}>
            {pending ? "Checking…" : "Verify"}
          </button>
        </div>
      </form>

      {state.checked && (
        <div
          className={`adm-flash ${state.valid ? "ok" : "err"}`}
          style={{ marginTop: "1rem", marginBottom: 0 }}
          role="status"
        >
          <strong>{state.message}</strong>
          {state.valid && state.order && (
            <dl className="adm-kv" style={{ marginTop: "0.6rem" }}>
              <dt>Name</dt>
              <dd>{state.order.name}</dd>
              <dt>Events</dt>
              <dd>{state.order.events.join(" · ")}</dd>
              <dt>Contact</dt>
              <dd>
                {state.order.email} · {state.order.phone}
                {state.order.college ? ` · ${state.order.college}` : ""}
              </dd>
              <dt>Paid</dt>
              <dd>
                {state.order.amountRupees === 0 ? "Free" : INR(state.order.amountRupees)}
                {state.order.demo ? " (demo)" : ""} ·{" "}
                {new Date(state.order.createdAt).toLocaleString("en-IN")}
              </dd>
            </dl>
          )}
        </div>
      )}
    </div>
  );
}
