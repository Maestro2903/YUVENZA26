/**
 * Email-domain restriction for visitor (Google) sign-in. Pure and client-safe
 * so the sign-in button, the OAuth callback and the checkout API all apply
 * the exact same rule. The database trigger in migration 0002 is the final
 * enforcement layer.
 */

/** Normalise an admin-entered domain: strip "@", whitespace, lowercase. */
export function normalizeDomain(raw: string | null | undefined): string {
  const d = (raw ?? "").trim().replace(/^@+/, "").toLowerCase();
  return d || "citchennai.net";
}

/** "*" disables the restriction. */
export function isDomainRestricted(domain: string | null | undefined): boolean {
  return normalizeDomain(domain) !== "*";
}

export function isAllowedEmail(email: string | null | undefined, domain: string | null | undefined): boolean {
  const d = normalizeDomain(domain);
  if (d === "*") return true;
  const e = (email ?? "").trim().toLowerCase();
  const at = e.lastIndexOf("@");
  if (at <= 0 || at === e.length - 1) return false;
  return e.slice(at + 1) === d;
}
