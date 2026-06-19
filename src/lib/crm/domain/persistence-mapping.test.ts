import assert from "node:assert/strict";
import test from "node:test";
import {
  FUTURE_CORE_TABLES,
  FUTURE_CUSTOMIZATION_TABLES,
  FUTURE_OPTIONAL_TABLES,
  FUTURE_SALES_COMMAND_TABLES,
  LEGACY_FIELD_TRANSLATION_PLAN,
  mapLeadDomainToFutureInsertShape,
  mapNotificationDomainToFutureInsertShape,
} from "@/lib/crm/domain";

test("future schema table groups are defined for the translation plan", () => {
  assert.equal(FUTURE_CORE_TABLES.includes("leads"), true);
  assert.equal(FUTURE_CUSTOMIZATION_TABLES.includes("formSources"), true);
  assert.equal(FUTURE_SALES_COMMAND_TABLES.includes("salesTargets"), true);
  assert.equal(FUTURE_OPTIONAL_TABLES.includes("dashboardWidgets"), true);
});

test("legacy field translation plan documents the known inherited fields", () => {
  const legacyFields = LEGACY_FIELD_TRANSLATION_PLAN.map((entry) => entry.legacyField);

  assert.equal(legacyFields.includes("primaryGoal"), true);
  assert.equal(legacyFields.includes("readinessLevel"), true);
  assert.equal(legacyFields.includes("topPathwayTitle"), true);
  assert.equal(legacyFields.includes("reportToken"), true);
  assert.equal(legacyFields.includes("currentStepKey"), true);
});

test("future lead insert mapping returns neutral lead fields only", () => {
  const mapped = mapLeadDomainToFutureInsertShape({
    name: "Ada Okafor",
    email: "ada@example.com",
    phone: "+2348012345678",
    sourceId: "website",
    sourceLabel: "Website",
    stageId: "new",
    stageLabel: "New Lead",
    status: "active",
    priority: "high",
    assignedUserId: "rep-1",
    estimatedValue: 250000,
    notes: "Ready for follow-up",
  });

  assert.equal(mapped.name, "Ada Okafor");
  assert.equal(mapped.priority, "high");
  assert.equal("primaryGoal" in mapped, false);
  assert.equal("readinessLevel" in mapped, false);
  assert.equal("topPathwayTitle" in mapped, false);
  assert.equal("reportToken" in mapped, false);
});

test("future notification mapping preserves neutral execution fields", () => {
  const mapped = mapNotificationDomainToFutureInsertShape({
    id: "notification-1",
    type: "follow_up_due",
    channel: "in_app",
    recipientUserId: "rep-1",
    leadId: "lead-1",
    title: "Follow-up due",
    message: "Call Ada today",
    status: "pending",
    createdAt: "2026-06-18T10:00:00.000Z",
    readAt: null,
  });

  assert.equal(mapped.type, "follow_up_due");
  assert.equal(mapped.channel, "in_app");
  assert.equal("publicReport" in mapped, false);
  assert.equal("answers" in mapped, false);
});
