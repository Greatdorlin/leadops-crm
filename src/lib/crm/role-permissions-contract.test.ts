import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_ROLE_PERMISSIONS,
  applyPermissionOverrides,
  PERMISSION_DEFINITIONS,
  ROLE_PERMISSION_ROLES,
  resolvePermissionList,
} from "@/lib/crm/role-permissions-contract";

test("affiliate defaults allow attributed lead creation and viewing", () => {
  assert.deepEqual(DEFAULT_ROLE_PERMISSIONS.affiliate, [
    "canViewLeads",
    "canCreateLeads",
    "canAccessAffiliateDashboard",
  ]);
});

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

test("user overrides add and remove role permissions while ignoring unknown keys", () => {
  assert.deepEqual(
    applyPermissionOverrides(
      ["canViewLeads", "canCreateLeads"],
      [
        { permission: "canCreateLeads", enabled: false },
        { permission: "canViewReports", enabled: true },
        { permission: "not-a-permission", enabled: true },
      ],
    ),
    ["canViewLeads", "canViewReports"],
  );
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
