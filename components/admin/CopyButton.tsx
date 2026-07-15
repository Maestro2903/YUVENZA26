"use client";

import { useState } from "react";

export default function CopyButton({ value, label = "Copy URL" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="adm-btn ghost small"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          window.prompt("Copy the URL below:", value);
        }
      }}
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}
