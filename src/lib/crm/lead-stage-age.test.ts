import assert from "node:assert/strict";
import test from "node:test";
import { getCurrentStageAge } from "./lead-stage-age";

const now = new Date("2026-11-04T14:00:00Z");
const earlier = "2026-10-20T10:00:00Z";
const reentry = "2026-11-02T10:00:00Z";

test("stage age uses the latest entry and ignores unrelated lead activity", () => {
  const events = [
    { eventType: "status_changed", eventData: { toStageId: "qualified" }, createdAt: earlier },
    { eventType: "workspace_automation_applied", eventData: { actionType: "set_stage", before: "new", after: "qualified" }, createdAt: reentry },
    { eventType: "note_added", eventData: null, createdAt: "2026-11-04T10:00:00Z" },
  ];
  assert.deepEqual(getCurrentStageAge("qualified", events, now), { enteredAt: reentry, days: 2 });
  assert.equal(getCurrentStageAge("proposal", events, now), null);
  assert.equal(getCurrentStageAge("qualified", [], now), null);
});
