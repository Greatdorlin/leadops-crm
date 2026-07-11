import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLeadOpportunityRollup,
  normalizeLeadOpportunityPayload,
} from "@/lib/crm/lead-opportunities";

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

test("won opportunities use realized value rather than weighted pipeline value", () => {
  const rollup = buildLeadOpportunityRollup([
    {
      status: "won",
      estimatedValue: 400000,
      expectedValue: 100000,
      closeProbability: 25,
      expectedCloseDate: null,
      reason: null,
    },
  ]);

  assert.equal(rollup.wonValue, 400000);
  assert.equal(rollup.expectedValue, null);
});

test("lost and unqualified opportunities require a reason", () => {
  const rejected = normalizeLeadOpportunityPayload({
    opportunities: [
      {
        offerLabel: "Implementation package",
        status: "unqualified",
        estimatedValue: 250000,
        reason: "",
      },
    ],
  });
  const accepted = normalizeLeadOpportunityPayload({
    opportunities: [
      {
        offerLabel: "Advisory package",
        status: "active",
        expectedCloseDate: "2026-07-20T10:30",
      },
    ],
  });

  assert.equal(rejected.success, false);
  assert.equal(accepted.success, true);
});

test("offer automation accepts a call schedule and rejects duplicate offer names", () => {
  const accepted = normalizeLeadOpportunityPayload({
    opportunities: [
      {
        offerLabel: "Premium plan",
        status: "qualified",
      },
    ],
    createCallTasksForNewlyQualified: true,
    callTaskDueAt: "2026-07-12T10:00:00.000Z",
  });
  const duplicate = normalizeLeadOpportunityPayload({
    opportunities: [
      { offerLabel: "Premium plan", status: "active" },
      { offerLabel: " premium PLAN ", status: "qualified" },
    ],
  });

  assert.equal(accepted.success, true);
  assert.equal(duplicate.success, false);
});
