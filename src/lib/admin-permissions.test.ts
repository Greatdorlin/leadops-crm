import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessLeadTrash,
  canAssignTasksToOthers,
  canManageSettings,
  canManageTeamMember,
  canManageTaskRecord,
  canManageIntegrationsAccess,
  canManageOwnerOnlySettings,
  canViewLeadRecord,
  canSoftDeleteLead,
  getGrantableAccessLevels,
  getVisibleAdminNavKeys,
  resolveAdminAccessLevel,
  scopeLeadListFilters,
} from "@/lib/admin-permissions";
import {
  canAccessAffiliateDashboard,
  canExportLeads,
  canReviewApprovalRequests,
  canManageBranchScope,
  canManageDepartmentScope,
  canManageTeamScope,
  canManageUsers,
  canVerifyPaymentClaims,
} from "@/lib/crm/authz";
import type { CrmUserRecord, LeadRecord } from "@/lib/crm/types";

function scopedUser(overrides: Partial<CrmUserRecord>): CrmUserRecord {
  return {
    id: "user-1",
    email: "manager@example.com",
    fullName: "Manager",
    role: "manager",
    isActive: true,
    accessScope: "all",
    branchId: null,
    departmentId: null,
    teamId: null,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    ...overrides,
  };
}

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
  assert.equal(resolveAdminAccessLevel({ role: "finance" }), "finance");
  assert.equal(resolveAdminAccessLevel({ role: "affiliate" }), "affiliate");
  assert.equal(resolveAdminAccessLevel({ role: "sales_agent" }), "sales_rep");
  assert.equal(resolveAdminAccessLevel({}), "sales_rep");
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
  assert.equal(
    canExportLeads({ accessLevel: "finance", email: "finance@example.com", role: "finance" }),
    false,
  );
  assert.equal(
    canExportLeads({ accessLevel: "affiliate", email: "affiliate@example.com", role: "affiliate" }),
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
  assert.equal(
    canManageUsers({
      accessLevel: "finance",
      email: "finance@example.com",
      role: "finance",
    }),
    false,
  );
  assert.equal(
    canManageUsers({
      accessLevel: "affiliate",
      email: "affiliate@example.com",
      role: "affiliate",
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
      accessLevel: "finance",
      email: "manager@example.com",
      role: "finance",
    }),
    false,
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

test("finance can verify payment claims without broad owner approval powers", () => {
  assert.equal(
    canVerifyPaymentClaims({
      accessLevel: "finance",
      email: "finance@example.com",
      role: "finance",
    }),
    true,
  );
  assert.equal(
    canReviewApprovalRequests({
      accessLevel: "finance",
      email: "finance@example.com",
      role: "finance",
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

test("affiliate navigation stays scoped to owned lead work", () => {
  assert.deepEqual(getVisibleAdminNavKeys("affiliate"), [
    "dashboard",
    "leads",
    "tasks",
    "notifications",
  ]);
});

test("finance navigation excludes broad reports and settings by default", () => {
  assert.deepEqual(getVisibleAdminNavKeys("finance"), [
    "dashboard",
    "leads",
    "tasks",
    "notifications",
  ]);
});

test("ad manager keeps integration access without full admin settings", () => {
  assert.equal(canManageIntegrationsAccess("general_admin", "ad_manager"), true);
});

test("affiliate access forces lead filters to immutable referral attribution", () => {
  const affiliate = scopedUser({
    id: "affiliate-user-id",
    email: "affiliate@example.com",
    role: "affiliate",
    accessScope: "own",
  });

  assert.deepEqual(
    scopeLeadListFilters(
      { assignedTo: "someone-else@example.com", search: "ade" },
      "affiliate",
      affiliate.email,
      affiliate,
    ),
    { affiliateReferrerId: "affiliate-user-id", search: "ade" },
  );
  assert.equal(
    canViewLeadRecord(
      "affiliate",
      { affiliateReferrerId: "affiliate-user-id", assignedTo: "manager@example.com" } as LeadRecord,
      affiliate.email,
      ["canViewLeads"],
      affiliate,
    ),
    true,
  );
  assert.equal(
    canViewLeadRecord(
      "affiliate",
      { affiliateReferrerId: "other-affiliate-id", assignedTo: "affiliate@example.com" } as LeadRecord,
      affiliate.email,
      ["canViewLeads"],
      affiliate,
    ),
    false,
  );
});

test("affiliate attribution scope fails closed without a stored user id", () => {
  assert.deepEqual(
    scopeLeadListFilters({}, "affiliate", "affiliate@example.com"),
    { scopeDenied: true },
  );
});

test("affiliate dashboard access honors configured permission removal", () => {
  const subject = {
    accessLevel: "affiliate" as const,
    email: "affiliate@example.com",
    role: "affiliate" as const,
  };

  assert.equal(canAccessAffiliateDashboard(subject), true);
  assert.equal(canAccessAffiliateDashboard({ ...subject, permissions: [] }), false);
});

test("manager list and record access fail closed outside the stored branch scope", () => {
  const manager = scopedUser({ accessScope: "branch", branchId: "branch-a" });
  assert.deepEqual(
    scopeLeadListFilters({ search: "Ada" }, "lead_sales_rep", manager.email, manager),
    { search: "Ada", branchId: "branch-a" },
  );
  assert.equal(
    canViewLeadRecord(
      "lead_sales_rep",
      { branchId: "branch-b" } as LeadRecord,
      manager.email,
      undefined,
      manager,
    ),
    false,
  );

  const incompleteScope = scopedUser({ accessScope: "team", teamId: null });
  assert.deepEqual(
    scopeLeadListFilters({}, "lead_sales_rep", incompleteScope.email, incompleteScope),
    { scopeDenied: true },
  );
});

test("configured permissions govern task assignment and completion", () => {
  assert.equal(canAssignTasksToOthers("general_admin", []), false);
  assert.equal(canAssignTasksToOthers("sales_rep", ["canAssignLeads"]), true);

  const task = {
    id: "task-1",
    leadId: "lead-1",
    title: "Follow up",
    description: null,
    dueAt: null,
    completedAt: null,
    assignedTo: "rep@example.com",
    createdBy: "manager@example.com",
    createdAt: new Date().toISOString(),
  };

  assert.equal(
    canManageTaskRecord(
      "sales_rep",
      task,
      "rep@example.com",
      ["canViewLeads"],
    ),
    false,
  );
  assert.equal(
    canManageTaskRecord(
      "sales_rep",
      task,
      "rep@example.com",
      ["canViewLeads", "canEditLeads"],
    ),
    true,
  );
});

test("sales manager can open settings but only grant sales rep access", () => {
  assert.equal(canManageSettings("lead_sales_rep"), true);
  assert.deepEqual(getGrantableAccessLevels("lead_sales_rep"), ["sales_rep", "affiliate"]);
});

test("normal roster management cannot grant owner access", () => {
  assert.deepEqual(getGrantableAccessLevels("master_admin"), [
    "general_admin",
    "lead_sales_rep",
    "finance",
    "sales_rep",
    "affiliate",
  ]);
});

test("owner-only settings reject general admin, demo-level access, and owner preview mode", () => {
  assert.equal(canManageOwnerOnlySettings("master_admin"), true);
  assert.equal(canManageOwnerOnlySettings("general_admin"), false);
  assert.equal(canManageOwnerOnlySettings("master_admin", "general_admin"), false);
});

test("general admin can grant operational, finance, and affiliate access", () => {
  assert.deepEqual(getGrantableAccessLevels("general_admin"), [
    "lead_sales_rep",
    "finance",
    "sales_rep",
    "affiliate",
  ]);
});

test("trash access is limited to master and general admin", () => {
  assert.equal(canAccessLeadTrash("master_admin"), true);
  assert.equal(canAccessLeadTrash("general_admin"), true);
  assert.equal(canAccessLeadTrash("lead_sales_rep"), false);
  assert.equal(canAccessLeadTrash("finance"), false);
  assert.equal(canAccessLeadTrash("sales_rep"), false);
  assert.equal(canAccessLeadTrash("affiliate"), false);
});

test("master admin, general admin, and sales manager can move leads to trash", () => {
  assert.equal(canSoftDeleteLead("master_admin"), true);
  assert.equal(canSoftDeleteLead("general_admin"), true);
  assert.equal(canSoftDeleteLead("lead_sales_rep"), true);
  assert.equal(canSoftDeleteLead("finance"), false);
  assert.equal(canSoftDeleteLead("sales_rep"), false);
  assert.equal(canSoftDeleteLead("affiliate"), false);
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
      "affiliate",
      "manager@example.com",
      "affiliate@example.com",
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

test("finance and affiliates cannot manage team access", () => {
  assert.equal(
    canManageTeamMember(
      "finance",
      "sales_rep",
      "finance@example.com",
      "rep@example.com",
    ),
    false,
  );
  assert.equal(
    canManageTeamMember(
      "affiliate",
      "affiliate",
      "affiliate@example.com",
      "peer@example.com",
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
