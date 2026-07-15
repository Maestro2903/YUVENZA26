"use client";

/**
 * Gate check-in tool: scan an entry-pass QR with the device camera (or paste
 * the payload / use a keyboard-wedge scanner). Every pass is verified
 * server-side - signature first, then the order - and the first valid scan
 * marks the attendee checked-in; re-scans of the same pass raise a warning.
 */
import { useCallback, useRef, useState, useTransition } from "react";
import {
  verifyTicketAction,
  type VerifyTicketState,
} from "@/app/(admin)/admin/actions/tickets";
import QrCamera from "@/components/admin/QrCamera";
import { INR } from "@/lib/content/types";

const INITIAL: VerifyTicketState = { checked: false, valid: false, message: "" };

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

export default function VerifyTicket() {
  const [state, setState] = useState<VerifyTicketState>(INITIAL);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const verifyingRef = useRef(false);

  const runVerify = useCallback((payload: string) => {
    if (verifyingRef.current || !payload.trim()) return;
    verifyingRef.current = true;
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("payload", payload.trim());
        const result = await verifyTicketAction(INITIAL, formData);
        setState(result);
        if (result.checked) {
          beep(!result.valid ? "fail" : result.alreadyCheckedIn ? "warn" : "ok");
        }
      } finally {
        verifyingRef.current = false;
      }
    });
  }, []);

  const flashClass = !state.checked
    ? ""
    : !state.valid
      ? "err"
      : state.alreadyCheckedIn
        ? "warn"
        : "ok";

  return (
    <div className="adm-card">
      <h2 className="adm-card-title">Verify entry pass · gate check-in</h2>

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
          <p className="adm-help">
            Passes are cryptographically signed - anything not issued by this site is rejected.
            The first valid scan checks the attendee in; scanning the same pass again shows a
            re-use warning.
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
              {state.order.checkedInAt && (
                <>
                  <dt>Checked in</dt>
                  <dd>{new Date(state.order.checkedInAt).toLocaleString("en-IN")}</dd>
                </>
              )}
            </dl>
          )}
        </div>
      )}
    </div>
  );
}
