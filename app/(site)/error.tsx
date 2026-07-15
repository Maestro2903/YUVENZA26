"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] Unhandled error:", error);
  }, [error]);

  return (
    <main className="err-page">
      <p className="err-kicker">Something went wrong</p>
      <h1 className="err-title">
        Oh n<span className="f-span">o</span>.
      </h1>
      <p className="err-body">
        An unexpected error interrupted the page. It wasn&#x27;t you - try again, and if it keeps
        happening, let us know.
      </p>
      <button type="button" onClick={reset} className="ho-cta primary err-cta">
        Try again
      </button>
    </main>
  );
}
