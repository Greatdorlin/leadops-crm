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
import {
  canExportLeads,
  canManageBranchScope,
  canManageDepartmentScope,
  canManageTeamScope,
  canManageUsers,
} from "@/lib/crm/authz";

test("initial admin email always resolves to master access", () => {
  const previousInitialAdminEmail = process.env.INITIAL_ADMIN_EMAIL;
  process.env.INITIAL_ADMIN_EMAIL = "owner@example.com";

  assert.equal(
    resolveAdminAccessLevel({
      email: "owner@example.com",
      role: "sales_agent",
    }),
    "master_admin",
  );

  if (previousInitialAdminEmail === undefined) {
    delete process.env.INITIAL_ADMIN_EMAIL;
  } else {
    process.env.INITIAL_ADMIN_EMAIL = previousInitialAdminEmail;
  }
});

test("legacy roles map cleanly into the new access experiences", () => {
  assert.equal(resolveAdminAccessLevel({ role: "manager" }), "general_admin");
  assert.equal(resolveAdminAccessLevel({ role: "ad_manager" }), "general_admin");
  assert.equal(resolveAdminAccessLevel({ role: "consultant" }), "lead_sales_rep");
  assert.equal(resolveAdminAccessLevel({ role: "finance" }), "general_admin");
  assert.equal(resolveAdminAccessLevel({ role: "sales_agent" }), "sales_rep");
});

test("neutral permission helpers keep owner and admin export access", () => {
  assert.equal(
    canExportLeads({ accessLevel: "master_admin", email: "owner@example.com", role: "admin" }),
    true,
  );
  assert.equal(
    canExportLeads({
      accessLevel: "general_admin",
      email: "admin@example.com",
      role: "manager",
    }),
    true,
  );
  assert.equal(
    canExportLeads({ accessLevel: "sales_rep", email: "rep@example.com", role: "sales_agent" }),
    false,
  );
});

test("neutral management helpers preserve inherited team-lead compatibility", () => {
  assert.equal(
    canManageUsers({
      accessLevel: "master_admin",
      email: "owner@example.com",
      role: "admin",
    }),
    true,
  );
  assert.equal(
    canManageUsers({
      accessLevel: "general_admin",
      email: "admin@example.com",
      role: "manager",
    }),
    true,
  );
  assert.equal(
    canManageUsers({
      accessLevel: "lead_sales_rep",
      email: "lead@example.com",
      role: "consultant",
    }),
    true,
  );
  assert.equal(
    canManageUsers({
      accessLevel: "sales_rep",
      email: "rep@example.com",
      role: "sales_agent",
    }),
    false,
  );
});

test("scope helpers prepare future branch, department, and team rules conservatively", () => {
  assert.equal(
    canManageTeamScope({
      accessLevel: "lead_sales_rep",
      email: "lead@example.com",
      role: "consultant",
    }),
    true,
  );
  assert.equal(
    canManageBranchScope({
      accessLevel: "general_admin",
      email: "manager@example.com",
      role: "manager",
    }),
    true,
  );
  assert.equal(
    canManageDepartmentScope({
      accessLevel: "general_admin",
      email: "manager@example.com",
      role: "finance",
    }),
    true,
  );
  assert.equal(
    canManageBranchScope({
      accessLevel: "sales_rep",
      email: "rep@example.com",
      role: "sales_agent",
    }),
    false,
  );
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
    "notifications",
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
      "owner@example.com",
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
