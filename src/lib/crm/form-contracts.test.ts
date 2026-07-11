import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeAdminLeadCapturePayload,
  normalizeAdminLeadProfilePayload,
} from "@/lib/crm/form-contracts";

test("lead capture payload accepts customFieldValues", () => {
  const parsed = normalizeAdminLeadCapturePayload({
    firstName: "Ada",
    email: "ada@example.com",
    customFieldValues: {
      "field-budget": "250000",
      "field-interest": "training",
    },
  });

  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.deepEqual(parsed.data.customFieldValues, {
      "field-budget": "250000",
      "field-interest": "training",
    });
  }
});

test("lead capture payload accepts a configured stage id", () => {
  const stageId = "11111111-1111-4111-8111-111111111111";
  const parsed = normalizeAdminLeadCapturePayload({
    firstName: "Ada",
    email: "ada@example.com",
    stageId,
  });

  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.stageId, stageId);
  }
  assert.equal(
    normalizeAdminLeadCapturePayload({
      firstName: "Ada",
      email: "ada@example.com",
      stageId: "not-a-stage-id",
    }).success,
    false,
  );
});

test("lead profile payload accepts customFieldValues", () => {
  const parsed = normalizeAdminLeadProfilePayload({
    firstName: "Ada",
    whatsappNumber: "+2348000000000",
    customFieldValues: {
      "field-budget": "150000",
    },
  });

  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.deepEqual(parsed.data.customFieldValues, {
      "field-budget": "150000",
    });
  }
});
