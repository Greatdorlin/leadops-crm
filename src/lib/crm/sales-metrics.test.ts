import assert from "node:assert/strict";
import test from "node:test";
import { buildSalesDashboardSummary } from "@/lib/crm/sales-metrics";
import type { CrmUserRecord, LeadRecord, LeadTaskRecord } from "@/lib/crm/types";
import type { IntakeEventAdminRow } from "@/lib/crm/intake-runtime";
import type { AdminSalesTargetRecord } from "@/lib/crm/sales-targets-admin";

function createLead(overrides: Partial<LeadRecord> = {}) {
  return {
    id: overrides.id ?? "lead-1",
    createdAt: overrides.createdAt ?? "2026-06-10T09:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-06-10T09:00:00.000Z",
    firstName: overrides.firstName ?? "Ada",
    lastName: overrides.lastName ?? "Okafor",
    email: overrides.email ?? "ada@example.com",
    whatsappNumber: overrides.whatsappNumber ?? "+2348012345678",
    crmStatus: overrides.crmStatus ?? "new",
    source: overrides.source ?? "website_form",
    priority: overrides.priority ?? "medium",
    assignedTo: overrides.assignedTo ?? "rep@example.com",
    lastActivityAt: overrides.lastActivityAt ?? "2026-06-17T10:00:00.000Z",
    estimatedValue: overrides.estimatedValue ?? 0,
    expectedValue: overrides.expectedValue ?? null,
    closeProbability: overrides.closeProbability ?? null,
    wonValue: overrides.wonValue ?? null,
    wonAt: overrides.wonAt ?? null,
    lostAt: overrides.lostAt ?? null,
    nextFollowUpAt: overrides.nextFollowUpAt ?? null,
  } as LeadRecord;
}

function createTask(overrides: Partial<LeadTaskRecord> = {}) {
  return {
    id: overrides.id ?? "task-1",
    leadId: overrides.leadId ?? "lead-1",
    title: overrides.title ?? "Call back",
    dueAt: overrides.dueAt ?? "2026-06-18T10:00:00.000Z",
    assignedTo: overrides.assignedTo ?? "rep@example.com",
    completedAt: overrides.completedAt ?? null,
    createdAt: overrides.createdAt ?? "2026-06-17T09:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-06-17T09:00:00.000Z",
  } as LeadTaskRecord;
}

function createUser(overrides: Partial<CrmUserRecord> = {}) {
  return {
    id: overrides.id ?? "user-1",
    email: overrides.email ?? "rep@example.com",
    fullName: overrides.fullName ?? "Ada Rep",
    role: overrides.role ?? "sales_agent",
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? "2026-06-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-06-01T00:00:00.000Z",
  } as CrmUserRecord;
}

test("sales dashboard summary tracks overdue follow-ups, source performance, and target progress", () => {
  const leads: LeadRecord[] = [
    createLead({
      id: "lead-new",
      crmStatus: "new",
      source: "website_form",
      estimatedValue: 100000,
      closeProbability: 50,
      nextFollowUpAt: "2026-06-18T08:00:00.000Z",
      lastActivityAt: "2026-06-10T08:00:00.000Z",
    }),
    createLead({
      id: "lead-won",
      crmStatus: "converted",
      source: "referral",
      estimatedValue: 150000,
      wonValue: 150000,
      wonAt: "2026-06-16T09:00:00.000Z",
      assignedTo: "owner@example.com",
    }),
    createLead({
      id: "lead-qualified",
      crmStatus: "qualified",
      source: "website_form",
      estimatedValue: 200000,
      expectedValue: 120000,
      assignedTo: "rep@example.com",
      nextFollowUpAt: "2026-06-18T15:00:00.000Z",
    }),
  ];

  const tasks: LeadTaskRecord[] = [
    createTask({
      id: "task-open",
      leadId: "lead-qualified",
      dueAt: "2026-06-18T18:00:00.000Z",
      assignedTo: "rep@example.com",
    }),
  ];

  const users: CrmUserRecord[] = [
    createUser({ id: "rep-user", email: "rep@example.com", fullName: "Ada Rep" }),
    createUser({ id: "owner-user", email: "owner@example.com", fullName: "Owner Admin", role: "admin" }),
  ];

  const intakeEvents: IntakeEventAdminRow[] = [
    {
      id: "intake-1",
      status: "lead_created",
      sourceName: "Website Contact Form",
      leadId: "lead-new",
      leadName: "Ada Okafor",
      errorMessage: null,
      normalizedSummary: [],
      rawPayload: null,
      createdAt: "2026-06-18T09:00:00.000Z",
    },
    {
      id: "intake-2",
      status: "failed",
      sourceName: "Website Contact Form",
      leadId: null,
      leadName: null,
      errorMessage: "Email or phone is required.",
      normalizedSummary: [],
      rawPayload: null,
      createdAt: "2026-06-18T09:30:00.000Z",
    },
  ];

  const activeTarget: AdminSalesTargetRecord = {
    id: "target-1",
    name: "June Sales Target",
    scope: "global",
    scopeId: null,
    period: "monthly",
    targetValue: 500000,
    currency: "NGN",
    startDate: "2026-06-01",
    endDate: "2026-06-30",
    isActive: true,
    archived: false,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  };

  const summary = buildSalesDashboardSummary({
    leads,
    tasks,
    users,
    intakeEvents,
    activeTarget,
    now: new Date("2026-06-18T12:00:00.000Z"),
  });

  assert.equal(summary.totalLeads, 3);
  assert.equal(summary.newLeads, 1);
  assert.equal(summary.overdueFollowUps, 0);
  assert.equal(summary.dueTodayFollowUps, 2);
  assert.equal(summary.stuckLeads, 1);
  assert.equal(summary.wonValue, 150000);
  assert.equal(summary.pipelineValue, 170000);
  assert.equal(summary.conversionRate, 33.3);
  assert.equal(summary.intakeSummary.leadCreated, 1);
  assert.equal(summary.intakeSummary.failed, 1);
  assert.equal(summary.topSources[0]?.label, "Website form");
  assert.equal(summary.topSources[0]?.totalLeads, 2);
  assert.equal(summary.target?.progressPercent, 30);
  assert.equal(summary.target?.remainingValue, 350000);
});
