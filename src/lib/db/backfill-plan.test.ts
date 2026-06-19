import assert from "node:assert/strict";
import test from "node:test";
import {
  planLeadAssignedUserBackfill,
  planLeadSourceBackfill,
  planLeadStageBackfill,
} from "@/lib/db/backfill-plan";

test("backfill plan maps known crmStatus values to normalized stage keys", () => {
  const plan = planLeadStageBackfill([
    { id: "lead-1", crmStatus: "converted", source: null, assignedTo: null, stageId: null },
    { id: "lead-2", crmStatus: "documents_pending", source: null, assignedTo: null, stageId: null },
  ]);

  assert.deepEqual(plan.updates.map((item) => item.to), ["won", "follow_up"]);
});

test("backfill plan maps known legacy sources to normalized source keys", () => {
  const plan = planLeadSourceBackfill([
    { id: "lead-1", crmStatus: null, source: "website_form", assignedTo: null, sourceId: null },
    { id: "lead-2", crmStatus: null, source: "google_sheets", assignedTo: null, sourceId: null },
  ]);

  assert.deepEqual(plan.updates.map((item) => item.to), ["website", "csv_import"]);
});

test("assigned user backfill is conservative and reports unresolved values instead of guessing", () => {
  const plan = planLeadAssignedUserBackfill(
    [
      { id: "lead-1", crmStatus: null, source: null, assignedTo: "rep@example.com", assignedUserId: null },
      { id: "lead-2", crmStatus: null, source: null, assignedTo: "unknown@example.com", assignedUserId: null },
    ],
    [{ id: "user-1", email: "rep@example.com", fullName: "Rep User" }],
  );

  assert.equal(plan.updatedCount, 1);
  assert.equal(plan.updates[0].to, "user-1");
  assert.equal(plan.unresolvedValues.includes("unknown@example.com"), true);
});
