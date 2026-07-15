import { describe, expect, it } from "vitest";
import { isAllowedEmail, isDomainRestricted, normalizeDomain } from "@/lib/auth/allowedDomain";

describe("normalizeDomain", () => {
  it("strips @, whitespace and case", () => {
    expect(normalizeDomain("@CitChennai.NET ")).toBe("citchennai.net");
    expect(normalizeDomain("citchennai.net")).toBe("citchennai.net");
  });
  it("falls back to the college domain when empty", () => {
    expect(normalizeDomain("")).toBe("citchennai.net");
    expect(normalizeDomain(null)).toBe("citchennai.net");
    expect(normalizeDomain(undefined)).toBe("citchennai.net");
  });
  it("passes the wildcard through", () => {
    expect(normalizeDomain("*")).toBe("*");
    expect(isDomainRestricted("*")).toBe(false);
    expect(isDomainRestricted("citchennai.net")).toBe(true);
  });
});

describe("isAllowedEmail", () => {
  const DOMAIN = "citchennai.net";

  it("accepts exact-domain emails, case-insensitively", () => {
    expect(isAllowedEmail("student@citchennai.net", DOMAIN)).toBe(true);
    expect(isAllowedEmail("Student@CITCHENNAI.NET", DOMAIN)).toBe(true);
    expect(isAllowedEmail("  student@citchennai.net  ", DOMAIN)).toBe(true);
  });

  it("rejects other domains", () => {
    expect(isAllowedEmail("someone@gmail.com", DOMAIN)).toBe(false);
    expect(isAllowedEmail("someone@yahoo.in", DOMAIN)).toBe(false);
  });

  it("rejects lookalike domains (suffix tricks)", () => {
    expect(isAllowedEmail("a@evilcitchennai.net", DOMAIN)).toBe(false);
    expect(isAllowedEmail("a@citchennai.net.evil.com", DOMAIN)).toBe(false);
    expect(isAllowedEmail("a@sub.citchennai.net", DOMAIN)).toBe(false);
  });

  it("rejects malformed emails", () => {
    expect(isAllowedEmail("", DOMAIN)).toBe(false);
    expect(isAllowedEmail(null, DOMAIN)).toBe(false);
    expect(isAllowedEmail("@citchennai.net", DOMAIN)).toBe(false);
    expect(isAllowedEmail("student@", DOMAIN)).toBe(false);
    expect(isAllowedEmail("no-at-sign", DOMAIN)).toBe(false);
  });

  it('uses the last "@" (quoted-local-part trickery)', () => {
    expect(isAllowedEmail("attacker@citchennai.net@gmail.com", DOMAIN)).toBe(false);
  });

  it("wildcard allows any well-formed email", () => {
    expect(isAllowedEmail("someone@gmail.com", "*")).toBe(true);
    expect(isAllowedEmail("bad-email", "*")).toBe(true); // unrestricted: no format check here
  });

  it("admin-entered domain is normalised before comparing", () => {
    expect(isAllowedEmail("s@citchennai.net", "@CitChennai.net ")).toBe(true);
  });
});
