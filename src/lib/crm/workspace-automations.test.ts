import assert from "node:assert/strict";
import test from "node:test";
import { workspaceAutomationMatches, workspaceAutomationPayloadSchema } from "./workspace-automations";

test("workspace automation matching is normalized and supports exclusion", () => {
  assert.equal(workspaceAutomationMatches("Website", " website ", "equals"), true);
  assert.equal(workspaceAutomationMatches("Referral", "website", "not_equals"), true);
});

test("workspace automation payload rejects cosmetic or unsupported actions", () => {
  assert.equal(workspaceAutomationPayloadSchema.safeParse({ name: "", conditionField: "source", conditionValue: "x", actionType: "email", actionValue: "y", isActive: true, sortOrder: 0 }).success, false);
  assert.equal(workspaceAutomationPayloadSchema.safeParse({ name: "Route leads", conditionField: "source", conditionOperator: "equals", conditionValue: "source-id", actionType: "assign_owner", actionValue: "user-id", isActive: true, sortOrder: 0 }).success, true);
});
