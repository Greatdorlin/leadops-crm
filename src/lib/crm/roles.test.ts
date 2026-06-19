import assert from "node:assert/strict";
import test from "node:test";
import {
  getDefaultPermissionScope,
  getRoleLabel,
  hasRoleAtLeast,
  mapLegacyAccessLevelToRole,
  mapLegacyCrmRoleToRole,
  normalizeRole,
  resolveLeadsDeskRole,
} from "@/lib/crm/roles";

test("legacy access levels map to neutral Leads Desk roles", () => {
  assert.equal(mapLegacyAccessLevelToRole("master_admin"), "owner");
  assert.equal(mapLegacyAccessLevelToRole("general_admin"), "admin");
  assert.equal(mapLegacyAccessLevelToRole("lead_sales_rep"), "team_lead");
  assert.equal(mapLegacyAccessLevelToRole("sales_rep"), "sales_rep");
});

test("legacy CRM roles map conservatively to neutral Leads Desk roles", () => {
  assert.equal(mapLegacyCrmRoleToRole("admin"), "owner");
  assert.equal(mapLegacyCrmRoleToRole("manager"), "manager");
  assert.equal(mapLegacyCrmRoleToRole("ad_manager"), "manager");
  assert.equal(mapLegacyCrmRoleToRole("finance"), "manager");
  assert.equal(mapLegacyCrmRoleToRole("consultant"), "team_lead");
  assert.equal(mapLegacyCrmRoleToRole("sales_agent"), "sales_rep");
});

test("normalizeRole accepts neutral and legacy values", () => {
  assert.equal(normalizeRole("owner"), "owner");
  assert.equal(normalizeRole("general_admin"), "admin");
  assert.equal(normalizeRole("consultant"), "team_lead");
  assert.equal(normalizeRole("unknown"), null);
});

test("role helpers expose neutral labels and ranks", () => {
  assert.equal(getRoleLabel("owner"), "Owner");
  assert.equal(getRoleLabel("team_lead"), "Team Lead");
  assert.equal(hasRoleAtLeast("owner", "admin"), true);
  assert.equal(hasRoleAtLeast("manager", "admin"), false);
});

test("resolved roles expose future scope defaults", () => {
  assert.equal(resolveLeadsDeskRole({ accessLevel: "master_admin" }), "owner");
  assert.equal(resolveLeadsDeskRole({ role: "consultant" }), "team_lead");
  assert.equal(getDefaultPermissionScope("owner"), "global");
  assert.equal(getDefaultPermissionScope("team_lead"), "team");
  assert.equal(getDefaultPermissionScope("sales_rep"), "own");
});
