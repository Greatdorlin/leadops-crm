import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_DEFINITIONS,
  ROLE_PERMISSION_ROLES,
  resolvePermissionList,
} from "@/lib/crm/role-permissions-contract";

test("unavailable permissions fall back to the effective role defaults", () => {
  assert.equal(
    resolvePermissionList(null, "manager"),
    DEFAULT_ROLE_PERMISSIONS.manager,
  );
  assert.equal(
    resolvePermissionList(undefined, "admin"),
    DEFAULT_ROLE_PERMISSIONS.admin,
  );
});

test("an explicit empty permission list remains authoritative", () => {
  assert.deepEqual(resolvePermissionList([], "admin"), []);
  assert.deepEqual(resolvePermissionList(["canViewLeads"], "manager"), [
    "canViewLeads",
  ]);
});

test("default role permissions contain only known permissions without duplicates", () => {
  const knownPermissions = new Set(
    PERMISSION_DEFINITIONS.map((permission) => permission.key),
  );

  for (const role of ROLE_PERMISSION_ROLES) {
    const permissions = DEFAULT_ROLE_PERMISSIONS[role];
    assert.equal(new Set(permissions).size, permissions.length);
    assert.equal(
      permissions.every((permission) => knownPermissions.has(permission)),
      true,
    );
  }
});
