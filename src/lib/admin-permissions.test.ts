import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessLeadTrash,
  canManageSettings,
  canManageTeamMember,
  canManageIntegrationsAccess,
  canSoftDeleteLead,
  getGrantableAccessLevels,
  getVisibleAdminNavKeys,
  resolveAdminAccessLevel,
  scopeLeadListFilters,
} from "@/lib/admin-permissions";

test("master admin email always resolves to master access", () => {
  assert.equal(
    resolveAdminAccessLevel({
      email: "greatdorlinwisdom@gmail.com",
      role: "sales_agent",
    }),
    "master_admin",
  );
});

test("legacy roles map cleanly into the new access experiences", () => {
  assert.equal(resolveAdminAccessLevel({ role: "manager" }), "general_admin");
  assert.equal(resolveAdminAccessLevel({ role: "ad_manager" }), "general_admin");
  assert.equal(resolveAdminAccessLevel({ role: "consultant" }), "lead_sales_rep");
  assert.equal(resolveAdminAccessLevel({ role: "finance" }), "general_admin");
  assert.equal(resolveAdminAccessLevel({ role: "sales_agent" }), "sales_rep");
});

test("sales rep access forces lead filters to current owner", () => {
  assert.deepEqual(
    scopeLeadListFilters(
      {
        assignedTo: "someone-else@example.com",
        search: "ade",
      },
      "sales_rep",
      "rep@example.com",
    ),
    {
      assignedTo: "rep@example.com",
      search: "ade",
    },
  );
});

test("sales rep navigation stays scoped to personal workspaces", () => {
  assert.deepEqual(getVisibleAdminNavKeys("sales_rep"), [
    "dashboard",
    "leads",
    "tasks",
    "reports",
  ]);
});

test("ad manager keeps integration access without full admin settings", () => {
  assert.equal(canManageIntegrationsAccess("general_admin", "ad_manager"), true);
});

test("sales manager can open settings but only grant sales rep access", () => {
  assert.equal(canManageSettings("lead_sales_rep"), true);
  assert.deepEqual(getGrantableAccessLevels("lead_sales_rep"), ["sales_rep"]);
});

test("general admin can grant sales manager and sales rep access", () => {
  assert.deepEqual(getGrantableAccessLevels("general_admin"), [
    "lead_sales_rep",
    "sales_rep",
  ]);
});

test("trash access is limited to master and general admin", () => {
  assert.equal(canAccessLeadTrash("master_admin"), true);
  assert.equal(canAccessLeadTrash("general_admin"), true);
  assert.equal(canAccessLeadTrash("lead_sales_rep"), false);
  assert.equal(canAccessLeadTrash("sales_rep"), false);
});

test("master admin, general admin, and sales manager can move leads to trash", () => {
  assert.equal(canSoftDeleteLead("master_admin"), true);
  assert.equal(canSoftDeleteLead("general_admin"), true);
  assert.equal(canSoftDeleteLead("lead_sales_rep"), true);
  assert.equal(canSoftDeleteLead("sales_rep"), false);
});

test("general admin can only remove non-admin team members", () => {
  assert.equal(
    canManageTeamMember(
      "general_admin",
      "lead_sales_rep",
      "manager@example.com",
      "rep@example.com",
    ),
    true,
  );
  assert.equal(
    canManageTeamMember(
      "general_admin",
      "general_admin",
      "manager@example.com",
      "peer@example.com",
    ),
    false,
  );
  assert.equal(
    canManageTeamMember(
      "general_admin",
      "master_admin",
      "manager@example.com",
      "greatdorlinwisdom@gmail.com",
    ),
    false,
  );
});

test("sales manager can only manage sales reps", () => {
  assert.equal(
    canManageTeamMember(
      "lead_sales_rep",
      "sales_rep",
      "manager@example.com",
      "rep@example.com",
    ),
    true,
  );
  assert.equal(
    canManageTeamMember(
      "lead_sales_rep",
      "lead_sales_rep",
      "manager@example.com",
      "peer-manager@example.com",
    ),
    false,
  );
});

test("nobody can remove themselves from admin", () => {
  assert.equal(
    canManageTeamMember(
      "master_admin",
      "general_admin",
      "manager@example.com",
      "manager@example.com",
    ),
    false,
  );
});
