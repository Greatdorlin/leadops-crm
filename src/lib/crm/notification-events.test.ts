import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAssignedLeadNotification,
  buildFollowUpNotification,
  buildLeadClosedNotification,
  buildLeadStageChangedNotification,
  buildWebhookLeadNotification,
  canAccessGlobalNotifications,
  notifyNewLeadAssigned,
  resolveNotificationLeadScope,
} from "@/lib/crm/notification-events";
import type { CrmUserRecord } from "@/lib/crm/types";

function scopedUser(overrides: Partial<CrmUserRecord> = {}): CrmUserRecord {
  return {
    id: "user-1",
    email: "rep@example.com",
    fullName: "Sales Rep",
    role: "sales_agent",
    isActive: true,
    accessScope: "own",
    branchId: null,
    departmentId: null,
    teamId: null,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    ...overrides,
  };
}

test("notification builders keep sellable v1 copy short and action-oriented", () => {
  const assigned = buildAssignedLeadNotification({
    leadId: "lead-1",
    recipientUserId: "user-1",
    leadName: "Ada Okafor",
  });
  assert.equal(assigned.title, "New lead assigned");
  assert.equal(assigned.message, "Ada Okafor is now in your queue.");

  const webhook = buildWebhookLeadNotification({
    leadId: "lead-2",
    formSourceName: "Website Contact Form",
    leadName: "Bayo Musa",
  });
  assert.equal(webhook.title, "New webhook lead captured");
  assert.equal(webhook.message, "Bayo Musa arrived through Website Contact Form.");

  const followUp = buildFollowUpNotification({
    type: "follow_up_overdue",
    recipientUserId: "user-1",
    leadId: "lead-3",
    leadName: "Chika Obi",
    dueLabel: "today",
  });
  assert.equal(followUp.title, "Follow-up overdue");

  const stageChanged = buildLeadStageChangedNotification({
    recipientUserId: "user-1",
    leadId: "lead-4",
    leadName: "David Musa",
    stageLabel: "Qualified",
  });
  assert.equal(stageChanged.message, "David Musa moved to Qualified.");

  const lost = buildLeadClosedNotification({
    type: "lead_marked_lost",
    recipientUserId: "user-1",
    leadId: "lead-5",
    leadName: "Efe Nnamdi",
    reasonLabel: "Budget not approved",
  });
  assert.equal(lost.message, "Efe Nnamdi was marked lost. Reason: Budget not approved.");
});

test("assigned-lead notifications do not fire without a recipient", async () => {
  const result = await notifyNewLeadAssigned({
    leadId: "lead-1",
    recipientUserId: null,
    leadName: "Ada Okafor",
  });

  assert.equal(result, null);
});

test("sales rep notification scope follows current lead assignment", () => {
  const user = scopedUser();

  assert.deepEqual(
    resolveNotificationLeadScope({
      accessLevel: "sales_rep",
      currentUserEmail: user.email,
      currentUser: user,
      permissions: ["canViewLeads"],
    }),
    { mode: "assigned", email: "rep@example.com" },
  );
});

test("global notifications stay restricted to admin access levels", () => {
  assert.equal(canAccessGlobalNotifications({ accessLevel: "master_admin" }), true);
  assert.equal(canAccessGlobalNotifications({ accessLevel: "general_admin" }), true);
  assert.equal(canAccessGlobalNotifications({ accessLevel: "lead_sales_rep" }), false);
  assert.equal(canAccessGlobalNotifications({ accessLevel: "sales_rep" }), false);
  assert.equal(canAccessGlobalNotifications({ accessLevel: "affiliate" }), false);
});

test("affiliate linked-lead notifications fail closed without lead permission", () => {
  const user = scopedUser({
    email: "affiliate@example.com",
    role: "affiliate",
  });

  assert.deepEqual(
    resolveNotificationLeadScope({
      accessLevel: "affiliate",
      currentUserEmail: user.email,
      currentUser: user,
      permissions: ["canAccessAffiliateDashboard"],
    }),
    { mode: "denied" },
  );
});

test("affiliate lead permission remains restricted to attributed leads", () => {
  const user = scopedUser({
    email: "affiliate@example.com",
    role: "affiliate",
  });

  assert.deepEqual(
    resolveNotificationLeadScope({
      accessLevel: "affiliate",
      currentUserEmail: user.email,
      currentUser: user,
      permissions: ["canViewLeads"],
    }),
    { mode: "affiliate", userId: "user-1" },
  );
});

test("notification scope respects team boundaries and fails closed when incomplete", () => {
  const manager = scopedUser({
    email: "manager@example.com",
    role: "manager",
    accessScope: "team",
    teamId: "team-a",
  });

  assert.deepEqual(
    resolveNotificationLeadScope({
      accessLevel: "general_admin",
      currentUserEmail: manager.email,
      currentUser: manager,
      permissions: ["canViewLeads"],
    }),
    { mode: "team", id: "team-a" },
  );
  assert.deepEqual(
    resolveNotificationLeadScope({
      accessLevel: "general_admin",
      currentUserEmail: manager.email,
      currentUser: { ...manager, teamId: null },
      permissions: ["canViewLeads"],
    }),
    { mode: "denied" },
  );
});
