import assert from "node:assert/strict";
import test from "node:test";
import { bulkLeadWorkflowSchema } from "@/lib/crm/bulk-lead-workflow";

const leadIds = ["2511d6ef-cdfa-4b9f-8660-f5a73a7a22d5"];
const massLeadIds = [
  "2511d6ef-cdfa-4b9f-8660-f5a73a7a22d5",
  "2511d6ef-cdfa-4b9f-8660-f5a73a7a22d6",
  "2511d6ef-cdfa-4b9f-8660-f5a73a7a22d7",
  "2511d6ef-cdfa-4b9f-8660-f5a73a7a22d8",
  "2511d6ef-cdfa-4b9f-8660-f5a73a7a22d9",
  "2511d6ef-cdfa-4b9f-8660-f5a73a7a22da",
];

test("five or fewer lead changes do not require mass confirmation", () => {
  assert.equal(bulkLeadWorkflowSchema.safeParse({
    leadIds,
    action: "assign",
    assignedTo: "rep@example.com",
  }).success, true);
});

test("mass lead changes require an exact confirmation and reason", () => {
  assert.equal(bulkLeadWorkflowSchema.safeParse({
    leadIds: massLeadIds,
    action: "assign",
    assignedTo: "rep@example.com",
    reason: "Redistribute the inbound queue.",
    confirmation: "max change",
  }).success, false);
  assert.equal(bulkLeadWorkflowSchema.safeParse({
    leadIds: massLeadIds,
    action: "assign",
    assignedTo: "rep@example.com",
    reason: "Redistribute the inbound queue.",
    confirmation: "MAX CHANGE",
  }).success, true);
});

test("mass lead changes are bounded and action-specific", () => {
  assert.equal(bulkLeadWorkflowSchema.safeParse({
    leadIds,
    action: "stage",
    reason: "Move qualified responses together.",
    confirmation: "MAX CHANGE",
  }).success, false);
  assert.equal(bulkLeadWorkflowSchema.safeParse({
    leadIds: Array.from({ length: 251 }, () => leadIds[0]),
    action: "stage",
    stageId: "886ffacb-cba3-4758-be73-bb013a5da8ca",
    reason: "Move qualified responses together.",
    confirmation: "MAX CHANGE",
  }).success, false);
});
