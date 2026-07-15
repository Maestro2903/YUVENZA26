import { describe, expect, it } from "vitest";
import {
  ALL_PERMISSION_KEYS,
  DEFAULT_ROLES,
  isValidPermissionKey,
  PERMISSIONS,
  roleHasPermission,
  SUPER_ADMIN_ROLE,
} from "@/lib/rbac/permissions";

describe("permission catalog", () => {
  it("has unique, well-formed keys", () => {
    expect(new Set(ALL_PERMISSION_KEYS).size).toBe(ALL_PERMISSION_KEYS.length);
    for (const key of ALL_PERMISSION_KEYS) {
      expect(key).toMatch(/^[a-z]+\.[a-z]+$/);
      expect(PERMISSIONS[key].label.length).toBeGreaterThan(0);
      expect(PERMISSIONS[key].category.length).toBeGreaterThan(0);
    }
  });

  it("validates keys", () => {
    expect(isValidPermissionKey("content.edit")).toBe(true);
    expect(isValidPermissionKey("content.hack")).toBe(false);
    expect(isValidPermissionKey("")).toBe(false);
  });
});

describe("default roles", () => {
  it("include the four documented roles", () => {
    expect(DEFAULT_ROLES.map((r) => r.name)).toEqual([
      "super_admin",
      "admin",
      "editor",
      "viewer",
    ]);
  });

  it("grant only known permissions", () => {
    for (const role of DEFAULT_ROLES) {
      for (const perm of role.permissions) {
        expect(isValidPermissionKey(perm)).toBe(true);
      }
    }
  });

  it("super_admin explicitly lists every permission", () => {
    const superAdmin = DEFAULT_ROLES.find((r) => r.name === SUPER_ADMIN_ROLE)!;
    expect([...superAdmin.permissions].sort()).toEqual([...ALL_PERMISSION_KEYS].sort());
  });

  it("editor cannot publish, delete or administer", () => {
    const editor = DEFAULT_ROLES.find((r) => r.name === "editor")!;
    for (const forbidden of [
      "content.publish",
      "content.delete",
      "users.manage",
      "roles.manage",
      "settings.manage",
      "payments.manage",
    ] as const) {
      expect(editor.permissions).not.toContain(forbidden);
    }
  });

  it("viewer is read-only", () => {
    const viewer = DEFAULT_ROLES.find((r) => r.name === "viewer")!;
    for (const perm of viewer.permissions) {
      expect(perm.endsWith(".view")).toBe(true);
    }
  });
});

describe("roleHasPermission", () => {
  it("grants super_admin everything, even unlisted permissions", () => {
    const role = { name: SUPER_ADMIN_ROLE, permissions: [] as string[] };
    for (const key of ALL_PERMISSION_KEYS) {
      expect(roleHasPermission(role, key)).toBe(true);
    }
  });

  it("checks the grant list for other roles", () => {
    const role = { name: "editor", permissions: ["content.edit", "media.upload"] };
    expect(roleHasPermission(role, "content.edit")).toBe(true);
    expect(roleHasPermission(role, "content.delete")).toBe(false);
    expect(roleHasPermission(role, "roles.manage")).toBe(false);
  });

  it("denies when there is no role", () => {
    expect(roleHasPermission(null, "content.view")).toBe(false);
    expect(roleHasPermission(undefined, "content.view")).toBe(false);
  });
});
