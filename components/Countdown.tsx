"use client";

import { useEffect, useState } from "react";

type Remaining = { days: number; hours: number; minutes: number; seconds: number };

/** Next August 11 (this year, or next year if it has already passed). */
function computeTarget(): number {
  const now = new Date();
  const y = now.getFullYear();
  let t = new Date(y, 7, 11, 0, 0, 0, 0).getTime(); // month is 0-indexed: 7 = August
  if (t < now.getTime()) t = new Date(y + 1, 7, 11, 0, 0, 0, 0).getTime();
  return t;
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
 * Live countdown to August 11, shown beside the hero. Renders "--" until it
 * mounts on the client (so server and client markup match), then ticks every
 * second.
 */
export default function Countdown() {
  const [t, setT] = useState<Remaining | null>(null);

  useEffect(() => {
    const target = computeTarget();
    const tick = () => setT(remaining(target));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const pad = (n: number | undefined) => (n == null ? "--" : String(n).padStart(2, "0"));
  const cells: [string, number | undefined][] = [
    ["Days", t?.days],
    ["Hours", t?.hours],
    ["Minutes", t?.minutes],
    ["Seconds", t?.seconds],
  ];

  return (
    <section className="cd" aria-label="Countdown to August 11">
      <div className="cd-head">
        <span className="cd-kicker">Counting down to</span>
        <span className="cd-date">
          August 11
        </span>
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
