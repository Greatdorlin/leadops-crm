import assert from "node:assert/strict";
import test from "node:test";
import { formatCrmDate, formatCrmDateTime } from "./formatters";

test("formatCrmDateTime renders timestamps in Africa/Lagos time", () => {
  const value = formatCrmDateTime("2026-06-11T11:52:00.000Z");

  assert.match(value, /Jun 11, 2026/);
  assert.match(value, /12:52 PM/);
});

test("formatCrmDate uses Africa/Lagos day boundaries", () => {
  const value = formatCrmDate("2026-06-11T23:30:00.000Z");

  assert.match(value, /Friday, June 12/);
});
