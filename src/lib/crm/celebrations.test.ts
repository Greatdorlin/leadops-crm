import assert from "node:assert/strict";
import test from "node:test";
import { buildLeadStageCelebration, buildTargetCelebration } from "@/lib/crm/celebrations";

test("lead stage celebration stays quiet for backward or lost states", () => {
  assert.equal(
    buildLeadStageCelebration({
      previousStatus: "contacted",
      nextStatus: "lost",
      stageLabel: "Lost",
    }),
    null,
  );

  assert.equal(
    buildLeadStageCelebration({
      previousStatus: "qualified",
      nextStatus: "contacted",
      stageLabel: "Contacted",
    }),
    null,
  );
});

test("lead stage celebration escalates for progress and conversion", () => {
  const milestone = buildLeadStageCelebration({
    previousStatus: "new",
    nextStatus: "contacted",
    stageLabel: "Contacted",
  });
  const win = buildLeadStageCelebration({
    previousStatus: "payment_pending",
    nextStatus: "converted",
    stageLabel: "Converted",
  });

  assert.equal(milestone?.intensity, "soft");
  assert.equal(win?.intensity, "burst");
  assert.equal(win?.title, "Lead converted");
});

test("target celebration only appears once progress reaches the goal", () => {
  assert.equal(
    buildTargetCelebration({
      targetName: "June target",
      progressPercent: 82,
      wonValueLabel: "NGN 820,000",
    }),
    null,
  );

  const celebration = buildTargetCelebration({
    targetName: "June target",
    progressPercent: 100,
    wonValueLabel: "NGN 1,000,000",
  });

  assert.equal(celebration?.badge, "Target hit");
  assert.equal(celebration?.intensity, "burst");
});
