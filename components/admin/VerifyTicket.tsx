"use client";

/**
 * Gate check-in tool: pick the gate's event, scan passes with the camera (or
 * paste / hardware-scan the payload). Verification is server-side (signature
 * first, then the order); check-ins are recorded PER EVENT with who scanned,
 * repeat scans at the same event warn, and mis-scans can be undone. Network
 * failures surface an error instead of a dead scanner.
 */
import { useCallback, useRef, useState, useTransition } from "react";
import {
  undoCheckinAction,
  verifyTicketAction,
  type VerifyTicketState,
} from "@/app/(admin)/admin/actions/tickets";
import QrCamera from "@/components/admin/QrCamera";
import { INR } from "@/lib/content/types";

const INITIAL: VerifyTicketState = { checked: false, valid: false, message: "" };

export type GateEventOption = { slug: string; title: string };

/** Short feedback tone so staff don't need to look at the screen. */
function beep(kind: "ok" | "warn" | "fail") {
  try {
    const Ctx = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = kind === "ok" ? 880 : kind === "warn" ? 440 : 180;
    gain.gain.value = 0.08;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (kind === "ok" ? 0.12 : 0.3));
    osc.onended = () => void ctx.close();
  } catch {
    // audio unavailable - visual feedback still works
  }
}

export default function VerifyTicket({
  events = [],
  compact = false,
}: {
  /** Events offered in the gate selector. */
  events?: GateEventOption[];
  /** Compact mode hides the card chrome (used by /admin/checkin). */
  compact?: boolean;
}) {
  const [state, setState] = useState<VerifyTicketState>(INITIAL);
  const [gateEvent, setGateEvent] = useState("");
  const [undoMessage, setUndoMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const verifyingRef = useRef(false);
  const gateRef = useRef(gateEvent);
  gateRef.current = gateEvent;

  const runVerify = useCallback((payload: string) => {
    if (verifyingRef.current || !payload.trim()) return;
    verifyingRef.current = true;
    setUndoMessage(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("payload", payload.trim());
        formData.set("gate_event", gateRef.current);
        const result = await verifyTicketAction(INITIAL, formData);
        setState(result);
        if (result.checked) {
          beep(!result.valid ? "fail" : result.alreadyCheckedIn ? "warn" : "ok");
        }
      } catch (err) {
        // Venue networks drop - never leave the scanner looking dead.
        console.warn("[checkin] verify failed:", err);
        beep("fail");
        setState({
          checked: true,
          valid: false,
          message: "Network problem - the scan did NOT go through. Check connection and rescan.",
        });
      } finally {
        verifyingRef.current = false;
      }
    });
  }, []);

  const runUndo = useCallback(() => {
    const { orderId, gateEvent: scannedGate } = state;
    if (!orderId) return;
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("order_id", orderId);
        formData.set("gate_event", scannedGate ?? "");
        const result = await undoCheckinAction({ done: false, message: "" }, formData);
        setUndoMessage(result.message);
        if (result.done) setState(INITIAL);
      } catch (err) {
        console.warn("[checkin] undo failed:", err);
        setUndoMessage("Network problem - undo did not go through.");
      }
    });
  }, [state]);

  const flashClass = !state.checked
    ? ""
    : !state.valid
      ? "err"
      : state.alreadyCheckedIn
        ? "warn"
        : "ok";

  const body = (
    <>
      <div className="adm-field" style={{ maxWidth: 420 }}>
        <label htmlFor="vt-gate">This gate&#x27;s event</label>
        <select
          id="vt-gate"
          value={gateEvent}
          onChange={(e) => setGateEvent(e.target.value)}
          className="adm-input"
        >
          <option value="">Any event (general entry)</option>
          {events.map((e) => (
            <option key={e.slug} value={e.slug}>
              {e.title}
            </option>
          ))}
        </select>
        <p className="adm-help">
          Pick the event this gate admits: passes check in per event, so multi-event orders scan
          cleanly at each of their gates and re-use at the same gate warns.
        </p>
      </div>

      <QrCamera onDecode={runVerify} paused={pending} />

      <hr className="adm-divider" style={{ margin: "1rem 0" }} />

      <form
        className="adm-form"
        style={{ maxWidth: "none" }}
        onSubmit={(e) => {
          e.preventDefault();
          runVerify(inputRef.current?.value ?? "");
          if (inputRef.current) inputRef.current.value = "";
        }}
      >
        <div className="adm-field">
          <label htmlFor="vt-payload">Or paste / hardware-scan the QR text</label>
          <input
            ref={inputRef}
            id="vt-payload"
            name="payload"
            className="adm-input"
            placeholder="YUV26|v1|…  (click here, then scan)"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="adm-form-actions">
          <button type="submit" className="adm-btn" disabled={pending}>
            {pending ? "Checking…" : "Verify"}
          </button>
        </div>
      </form>

      {undoMessage && (
        <p className="adm-flash ok" style={{ marginTop: "1rem", marginBottom: 0 }} role="status">
          {undoMessage}
        </p>
      )}

      {state.checked && (
        <div
          className={`adm-flash ${flashClass}`}
          style={{ marginTop: "1rem", marginBottom: 0 }}
          role="status"
          aria-live="assertive"
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
              {state.order.checkins.length > 0 && (
                <>
                  <dt>Scans</dt>
                  <dd>
                    {state.order.checkins
                      .map(
                        (c) =>
                          `${c.eventTitle} at ${new Date(c.scannedAt).toLocaleTimeString("en-IN")}`
                      )
                      .join(" · ")}
                  </dd>
                </>
              )}
            </dl>
          )}
          {state.valid && state.orderId && (
            <div className="adm-form-actions" style={{ marginTop: "0.6rem" }}>
              <button type="button" className="adm-btn ghost small" onClick={runUndo} disabled={pending}>
                Undo this check-in
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );

  if (compact) return <div>{body}</div>;
  return (
    <div className="adm-card">
      <h2 className="adm-card-title">Verify entry pass · gate check-in</h2>
      {body}
    </div>
  );
}
