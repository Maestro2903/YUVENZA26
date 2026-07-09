"use client";

import { useEffect } from "react";

/**
 * Applies the per-page `<body>` class (e.g. `index`, `work-case`, `beige`)
 * that the original site sets, driving background colour + transition rules.
 */
export default function BodyClass({ name }: { name: string }) {
  useEffect(() => {
    const classes = name.split(/\s+/).filter(Boolean);
    document.body.classList.add(...classes);
    return () => {
      document.body.classList.remove(...classes);
    };
  }, [name]);
  return null;
}
