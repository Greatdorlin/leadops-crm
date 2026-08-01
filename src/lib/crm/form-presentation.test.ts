import assert from "node:assert/strict";
import test from "node:test";
import { clampFormStep, getFormStepProgress } from "@/lib/crm/form-presentation";

test("step presentation clamps its active question when conditional fields change", () => {
  assert.equal(clampFormStep(4, 3), 2);
  assert.equal(clampFormStep(-1, 3), 0);
  assert.equal(clampFormStep(2, 0), 0);
});

test("step presentation reports useful progress for all form sizes", () => {
  assert.equal(getFormStepProgress(0, 4), 25);
  assert.equal(getFormStepProgress(3, 4), 100);
  assert.equal(getFormStepProgress(0, 0), 100);
});
