"use client";

import { useEffect, useState } from "react";

type Remaining = { days: number; hours: number; minutes: number; seconds: number };

/**
 * Fallback when no (or an invalid) target is configured: the next August 11.
 */
function fallbackTarget(): number {
  const now = new Date();
  const y = now.getFullYear();
  let t = new Date(y, 7, 11, 0, 0, 0, 0).getTime();
  if (t < now.getTime()) t = new Date(y + 1, 7, 11, 0, 0, 0, 0).getTime();
  return t;
}

function resolveTarget(iso?: string): number {
  if (iso) {
    const t = new Date(iso).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return fallbackTarget();
}

function remaining(target: number): Remaining {
  const ms = Math.max(0, target - Date.now());
  const s = Math.floor(ms / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

/**
 * Live countdown to the fest, shown beside the hero. The target date and its
 * label are editable in the admin panel (Site content -> fest). Renders "--"
 * until it mounts on the client so server and client markup match.
 */
export default function Countdown({
  targetIso,
  dateLabel = "August 11",
}: {
  /** ISO datetime to count down to (site_content.fest.countdownTarget). */
  targetIso?: string;
  /** Human-readable label for the date (site_content.fest.countdownDateLabel). */
  dateLabel?: string;
}) {
  const [t, setT] = useState<Remaining | null>(null);

  useEffect(() => {
    const target = resolveTarget(targetIso);
    const tick = () => setT(remaining(target));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  const pad = (n: number | undefined) => (n == null ? "--" : String(n).padStart(2, "0"));
  const cells: [string, number | undefined][] = [
    ["Days", t?.days],
    ["Hours", t?.hours],
    ["Minutes", t?.minutes],
    ["Seconds", t?.seconds],
  ];

  return (
    <section className="cd" aria-label={`Countdown to ${dateLabel}`}>
      <div className="cd-head">
        <span className="cd-kicker">Counting down to</span>
        <span className="cd-date">{dateLabel}</span>
      </div>
      <div className="cd-grid">
        {cells.map(([label, value], i) => (
          <div className="cd-cell" key={label}>
            <span className="cd-num">{pad(value)}</span>
            <span className="cd-label">{label}</span>
            {i < cells.length - 1 && <span className="cd-colon" aria-hidden="true">:</span>}
          </div>
        ))}
      </div>
    </section>
  );
}
