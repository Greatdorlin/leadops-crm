import assert from "node:assert/strict";
import test from "node:test";
import { deriveFormSubmissionId } from "./form-submission-id";
import { isFormUuid } from "./form-routing-identifiers";

test("submission retry IDs are stable and scoped to the form and answers", () => {
  const id = deriveFormSubmissionId("form-one", "attempt-one", { email: "lead@example.test" });
  assert.ok(isFormUuid(id));
  assert.equal(deriveFormSubmissionId("form-one", "attempt-one", { email: "lead@example.test" }), id);
  assert.notEqual(deriveFormSubmissionId("form-two", "attempt-one", { email: "lead@example.test" }), id);
  assert.notEqual(deriveFormSubmissionId("form-one", "attempt-two", { email: "lead@example.test" }), id);
  assert.notEqual(deriveFormSubmissionId("form-one", "attempt-one", { email: "other@example.test" }), id);
});
