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
