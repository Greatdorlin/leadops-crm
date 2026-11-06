import assert from "node:assert/strict";
import test from "node:test";
import { buildDemoLeadDetail } from "@/lib/crm/demo-data";
import { buildAdminLeadListItem } from "@/lib/crm/lead-view";

test("lead list excludes closed value while retaining historical deal amounts", () => {
  const { lead } = buildDemoLeadDetail("demo-lead-aurelia");
  const open = { ...lead, crmStatus: "new" as const, wonAt: null, lostAt: null,
    archivedAt: null, estimatedValue: 15000, expectedValue: 9000 };
  assert.equal(buildAdminLeadListItem(open).expectedValue, 9000);
  for (const closed of [
    { ...open, lostAt: "2026-11-06T00:00:00Z" },
    { ...open, wonAt: "2026-11-06T00:00:00Z" },
    { ...open, crmStatus: "lost" as const },
    { ...open, archivedAt: "2026-11-06T00:00:00Z" },
  ]) {
    const result = buildAdminLeadListItem(closed);
    assert.equal(result.expectedValue, 0);
    assert.equal(result.estimatedValue, 15000);
  }
  assert.equal(buildAdminLeadListItem({ ...open, stageId: "lost-stage" }, {
    stage: { id: "lost-stage", key: "lost", name: "Lost" },
  }).expectedValue, 0);
});
