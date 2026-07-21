import assert from "node:assert/strict";
import test from "node:test";
import {
  formatLeadStageDeleteConflict,
  normalizeAdminLeadStagePayload,
} from "@/lib/crm/lead-stages-admin";

test("lead stage colors accept accessible picker values and reject arbitrary text", () => {
  assert.equal(
    normalizeAdminLeadStagePayload({ name: "Qualified", color: "#2563eb" }).success,
    true,
  );
  assert.equal(
    normalizeAdminLeadStagePayload({ name: "Qualified", color: "blue-ish" }).success,
    false,
  );
});

test("stage deletion conflict identifies every referencing resource", () => {
  assert.equal(
    formatLeadStageDeleteConflict({ leads: 2, formSources: 1, forms: 1, formRules: 3 }),
    "This stage is still used by 2 leads, 1 form source, 1 form, 3 automation rules. Reassign or update them, then try again.",
  );
});
