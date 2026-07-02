import assert from "node:assert/strict";
import test from "node:test";
import { buildLeadOpportunityRollup } from "@/lib/crm/lead-opportunities";

test("lead opportunity rollup keeps only active and qualified offers in pipeline", () => {
  const rollup = buildLeadOpportunityRollup([
    {
      status: "qualified",
      estimatedValue: 500000,
      expectedValue: null,
      closeProbability: 60,
      expectedCloseDate: "2026-07-10T10:00:00.000Z",
      reason: null,
    },
    {
      status: "unqualified",
      estimatedValue: 250000,
      expectedValue: null,
      closeProbability: 40,
      expectedCloseDate: "2026-07-15T10:00:00.000Z",
      reason: "Budget mismatch",
    },
    {
      status: "won",
      estimatedValue: 120000,
      expectedValue: 120000,
      closeProbability: 100,
      expectedCloseDate: "2026-07-01T10:00:00.000Z",
      reason: null,
    },
  ]);

  assert.equal(rollup.estimatedValue, 500000);
  assert.equal(rollup.expectedValue, 300000);
  assert.equal(rollup.closeProbability, 60);
  assert.equal(rollup.wonValue, 120000);
  assert.equal(rollup.activeCount, 1);
  assert.equal(rollup.qualifiedCount, 1);
  assert.equal(rollup.inactiveCount, 1);
  assert.equal(rollup.wonCount, 1);
  assert.equal(rollup.expectedCloseDate, "2026-07-10T10:00:00.000Z");
});

test("lead opportunity rollup exposes a reason only when every offer drops out", () => {
  const rollup = buildLeadOpportunityRollup([
    {
      status: "lost",
      estimatedValue: 350000,
      expectedValue: null,
      closeProbability: 45,
      expectedCloseDate: null,
      reason: "Could not afford this package",
    },
  ]);

  assert.equal(rollup.estimatedValue, null);
  assert.equal(rollup.expectedValue, null);
  assert.equal(rollup.closeProbability, null);
  assert.equal(rollup.lostReason, "Could not afford this package");
  assert.equal(rollup.summaryLabel.includes("removed from pipeline"), true);
});
