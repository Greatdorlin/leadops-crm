import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeFormSubmissionCursor,
  encodeFormSubmissionCursor,
} from "@/lib/crm/form-submission-pagination";

test("form submission cursors round-trip safely", () => {
  const value = {
    createdAt: "2026-07-11T12:00:00.000Z",
    id: "11111111-1111-4111-8111-111111111111",
  };

  const cursor = encodeFormSubmissionCursor(value);
  assert.doesNotMatch(cursor, /[|{}]/);
  assert.deepEqual(decodeFormSubmissionCursor(cursor), value);
});

test("invalid form submission cursors are ignored", () => {
  assert.equal(decodeFormSubmissionCursor("not-a-cursor"), null);
  assert.equal(decodeFormSubmissionCursor("a".repeat(513)), null);
});
