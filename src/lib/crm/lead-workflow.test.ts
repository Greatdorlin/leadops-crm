import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLeadAssignmentPlan,
  normalizeLeadWorkflowPayload,
  resolveLeadLifecycleTransition,
} from "@/lib/crm/lead-workflow";

test("workflow payload accepts focused routing updates", () => {
  const parsed = normalizeLeadWorkflowPayload({
    assignedTo: " Owner@Example.com ",
    stage: "qualified",
    priority: "high",
    nextFollowUpAt: "2026-07-10T13:30:00.000Z",
  });

  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.assignedTo, "Owner@Example.com");
    assert.equal(parsed.data.stage, "qualified");
  }
});

test("workflow payload accepts configured stage ids without accepting conflicting stage keys", () => {
  const stageId = "11111111-1111-4111-8111-111111111111";
  const parsed = normalizeLeadWorkflowPayload({ stageId });

  assert.equal(parsed.success, true);
  assert.equal(
    normalizeLeadWorkflowPayload({ stage: "qualified", stageId }).success,
    false,
  );
});

test("workflow payload rejects profile fields and invalid owners", () => {
  assert.equal(normalizeLeadWorkflowPayload({ firstName: "Ada" }).success, false);
  assert.equal(normalizeLeadWorkflowPayload({ assignedTo: "not-an-email" }).success, false);
  assert.equal(normalizeLeadWorkflowPayload({}).success, false);
});

test("changing the primary owner keeps collaborators without duplicates", () => {
  const result = buildLeadAssignmentPlan({
    existingPrimary: "first@example.com",
    existingAssignees: ["first@example.com", "second@example.com"],
    requestedPrimary: "THIRD@example.com",
    primaryWasProvided: true,
    assigneesWereProvided: false,
  });

  assert.deepEqual(result, {
    primary: "third@example.com",
    assignees: ["third@example.com", "second@example.com"],
  });
});

test("clearing the primary owner clears the assignment", () => {
  const result = buildLeadAssignmentPlan({
    existingPrimary: "first@example.com",
    existingAssignees: ["first@example.com", "second@example.com"],
    requestedPrimary: null,
    primaryWasProvided: true,
    assigneesWereProvided: false,
  });

  assert.deepEqual(result, { primary: null, assignees: [] });
});

test("won and lost transitions cannot leave contradictory lifecycle state", () => {
  assert.deepEqual(
    resolveLeadLifecycleTransition({
      stage: "converted",
      stageIsWon: true,
      stageIsLost: false,
      existingLostAt: "2026-06-01T00:00:00.000Z",
      now: "2026-07-10T00:00:00.000Z",
    }),
    {
      wonAt: "2026-07-10T00:00:00.000Z",
      lostAt: null,
      lostReason: null,
      closesFollowUp: true,
    },
  );

  assert.deepEqual(
    resolveLeadLifecycleTransition({
      stage: "qualified",
      stageIsWon: false,
      stageIsLost: false,
      existingWonAt: "2026-06-01T00:00:00.000Z",
      now: "2026-07-10T00:00:00.000Z",
    }),
    {
      wonAt: null,
      lostAt: null,
      lostReason: null,
      closesFollowUp: false,
    },
  );
});
