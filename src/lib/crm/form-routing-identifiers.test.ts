import assert from "node:assert/strict";
import test from "node:test";
import { getFormOwnerReference, isFormUuid } from "./form-routing-identifiers";

test("form owner routing separates legacy email references from PostgreSQL UUIDs", () => {
  const id = "abcd1234-56ab-7890-cdef-1234567890ab";
  assert.equal(isFormUuid("missing-form"), false);
  assert.deepEqual(getFormOwnerReference(id), { id, email: null });
  assert.deepEqual(getFormOwnerReference(" OWNER@EXAMPLE.TEST "), { id: null, email: "owner@example.test" });
  assert.equal(getFormOwnerReference("unknown user"), null);
});
