import assert from "node:assert/strict";
import test from "node:test";
import { buildAffiliateDashboardSummary } from "@/lib/crm/affiliate-dashboard";
import type { LeadRecord, LeadTaskRecord } from "@/lib/crm/types";

function createLead(overrides: Partial<LeadRecord> = {}) {
  return {
    id: overrides.id ?? "lead-1",
    createdAt: overrides.createdAt ?? "2026-06-10T09:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-06-10T09:00:00.000Z",
    lastActivityAt: overrides.lastActivityAt ?? "2026-06-10T09:00:00.000Z",
    deletedAt: null,
    deletedBy: null,
    crmStatus: overrides.crmStatus ?? "new",
    source: overrides.source ?? "agent",
    sourceDetail: null,
    priority: overrides.priority ?? "medium",
    assignedTo: overrides.assignedTo ?? "affiliate@example.com",
    assignedToList: overrides.assignedToList ?? [],
    leadCustomerType: overrides.leadCustomerType ?? "direct",
    firstName: overrides.firstName ?? "Ada",
    lastName: overrides.lastName ?? "Okafor",
    email: overrides.email ?? "ada@example.com",
    whatsappNumber: overrides.whatsappNumber ?? "+2348012345678",
    state: null,
    country: null,
    region: null,
    city: null,
    address: null,
    postalCode: null,
    companyName: overrides.companyName ?? null,
    sourceId: null,
    stageId: overrides.stageId ?? null,
    campaignId: null,
    campaignLabel: null,
    assignedUserId: null,
    teamId: null,
    branchId: null,
    departmentId: null,
    estimatedValue: overrides.estimatedValue ?? 100000,
    expectedValue: overrides.expectedValue ?? null,
    wonValue: overrides.wonValue ?? null,
    closeProbability: overrides.closeProbability ?? null,
    expectedCloseDate: null,
    wonAt: overrides.wonAt ?? null,
    lostAt: overrides.lostAt ?? null,
    lostReason: null,
    nextFollowUpAt: overrides.nextFollowUpAt ?? null,
  } as LeadRecord;
}

function createTask(overrides: Partial<LeadTaskRecord> = {}) {
  return {
    id: overrides.id ?? "task-1",
    leadId: overrides.leadId ?? "lead-1",
    title: overrides.title ?? "Follow up",
    description: null,
    dueAt: overrides.dueAt ?? "2026-06-18T10:00:00.000Z",
    completedAt: overrides.completedAt ?? null,
    assignedTo: overrides.assignedTo ?? "affiliate@example.com",
    createdBy: null,
    createdAt: overrides.createdAt ?? "2026-06-17T10:00:00.000Z",
  } as LeadTaskRecord;
}

test("affiliate dashboard only summarizes leads assigned to the affiliate", () => {
  const summary = buildAffiliateDashboardSummary({
    affiliateEmail: "affiliate@example.com",
    commissionRatePercent: 5,
    now: new Date("2026-06-18T12:00:00.000Z"),
    leads: [
      createLead({
        id: "direct-lead",
        leadCustomerType: "direct",
        expectedValue: 50000,
        nextFollowUpAt: "2026-06-18T15:00:00.000Z",
      }),
      createLead({
        id: "business-lead",
        leadCustomerType: "business",
        companyName: "Northwind Clinic",
        wonAt: "2026-06-17T12:00:00.000Z",
        crmStatus: "converted",
        wonValue: 250000,
      }),
      createLead({
        id: "shared-lead",
        assignedTo: "manager@example.com",
        assignedToList: ["affiliate@example.com"],
        estimatedValue: 200000,
        closeProbability: 50,
      }),
      createLead({
        id: "other-lead",
        assignedTo: "other@example.com",
        assignedToList: [],
        estimatedValue: 999999,
      }),
    ],
    tasks: [
      createTask({ id: "affiliate-task", leadId: "direct-lead" }),
      createTask({ id: "lead-task", leadId: "shared-lead", assignedTo: "manager@example.com" }),
      createTask({ id: "other-task", leadId: "other-lead", assignedTo: "other@example.com" }),
      createTask({ id: "completed-task", leadId: "direct-lead", completedAt: "2026-06-18T12:00:00.000Z" }),
    ],
  });

  assert.equal(summary.totalLeads, 3);
  assert.equal(summary.directLeads, 2);
  assert.equal(summary.businessLeads, 1);
  assert.equal(summary.wonLeads, 1);
  assert.equal(summary.wonValue, 250000);
  assert.equal(summary.earningsValue, 12500);
  assert.equal(summary.dueTodayFollowUps, 1);
  assert.equal(summary.openTasks, 2);
  assert.deepEqual(
    summary.recentLeads.map((lead) => lead.id).sort(),
    ["business-lead", "direct-lead", "shared-lead"].sort(),
  );
});

test("affiliate dashboard does not claim earnings when no commission plan is configured", () => {
  const summary = buildAffiliateDashboardSummary({
    affiliateEmail: "affiliate@example.com",
    leads: [createLead({ wonAt: "2026-06-17T12:00:00.000Z", crmStatus: "converted", wonValue: 100000 })],
    tasks: [],
  });

  assert.equal(summary.commissionConfigured, false);
  assert.equal(summary.earningsValue, 0);
});
