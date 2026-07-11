import assert from "node:assert/strict";
import test from "node:test";
import { decodeLeadCursor, encodeLeadCursor } from "@/lib/crm/lead-pagination";

test("lead cursors round-trip without exposing query syntax", () => {
  const value = {
    updatedAt: "2026-07-11T08:30:00.000Z",
    id: "5a86cca3-9782-47c7-b749-6da1bc61291f",
  };

  const cursor = encodeLeadCursor(value);

  assert.doesNotMatch(cursor, /[|{}]/);
  assert.deepEqual(decodeLeadCursor(cursor), value);
});

test("invalid and oversized cursors are rejected", () => {
  assert.equal(decodeLeadCursor("not-a-cursor"), null);
  assert.equal(decodeLeadCursor("a".repeat(513)), null);
  assert.equal(decodeLeadCursor(Buffer.from(JSON.stringify(["invalid", "lead-id"])).toString("base64url")), null);
});
