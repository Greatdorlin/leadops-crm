import assert from "node:assert/strict";
import test from "node:test";
import {
  CUSTOM_FIELD_TYPES,
  FORM_SOURCE_TYPES,
  LEAD_INTAKE_EVENT_STATUSES,
  LEAD_PRIORITIES,
  LEAD_STAGE_TYPES,
  NOTIFICATION_TYPES,
  SALES_TARGET_PERIODS,
  SALES_TARGET_SCOPES,
} from "@/lib/crm/domain";

test("lead stage and priority constants match the Leads Desk sales command vocabulary", () => {
  assert.deepEqual(LEAD_STAGE_TYPES, [
    "new",
    "contacted",
    "follow_up",
    "qualified",
    "proposal",
    "won",
    "lost",
    "archived",
  ]);
  assert.deepEqual(LEAD_PRIORITIES, ["low", "normal", "high", "urgent"]);
});

test("custom field type constants cover the planned extensibility set", () => {
  assert.equal(CUSTOM_FIELD_TYPES.includes("multi_select"), true);
  assert.equal(CUSTOM_FIELD_TYPES.includes("currency"), true);
  assert.equal(CUSTOM_FIELD_TYPES.includes("user_reference"), true);
});

test("form source and intake status constants cover the planned intake flow", () => {
  assert.deepEqual(FORM_SOURCE_TYPES, [
    "website",
    "wordpress",
    "webhook",
    "csv",
    "manual",
    "ads",
    "other",
  ]);
  assert.deepEqual(LEAD_INTAKE_EVENT_STATUSES, [
    "received",
    "mapped",
    "lead_created",
    "failed",
    "ignored",
  ]);
});

test("sales target scope and period constants cover the planned reporting model", () => {
  assert.deepEqual(SALES_TARGET_SCOPES, [
    "global",
    "branch",
    "department",
    "team",
    "user",
  ]);
  assert.deepEqual(SALES_TARGET_PERIODS, [
    "daily",
    "weekly",
    "monthly",
    "quarterly",
    "yearly",
    "custom",
  ]);
});

test("notification type constants cover the planned execution signals", () => {
  assert.equal(NOTIFICATION_TYPES.includes("new_lead_assigned"), true);
  assert.equal(NOTIFICATION_TYPES.includes("follow_up_overdue"), true);
  assert.equal(NOTIFICATION_TYPES.includes("target_milestone_reached"), true);
});
