import assert from "node:assert/strict";
import test from "node:test";
import { STANDARD_WEBHOOK_MAPPINGS } from "./standard-webhook-mappings";
import { normalizeAdminFormFieldMappingsPayload } from "./form-sources-admin";
import { buildSamplePayloadFromMappings } from "./intake-runtime";

test("standard webhook fields are accepted by the existing mapping contract", () => {
  const parsed = normalizeAdminFormFieldMappingsPayload(STANDARD_WEBHOOK_MAPPINGS);
  assert.equal(parsed.success, true);
  assert.deepEqual(STANDARD_WEBHOOK_MAPPINGS.map((mapping) => mapping.externalFieldName), ["name", "email", "phone"]);
  const sample = buildSamplePayloadFromMappings(STANDARD_WEBHOOK_MAPPINGS.map((mapping) => ({ ...mapping })));
  assert.ok(sample.email);
  assert.ok(sample.phone);
});
