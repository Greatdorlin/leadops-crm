import test from "node:test";
import assert from "node:assert/strict";
import { tourProgress } from "./workspace-tour-progress";
test("cross-page progress is scoped to the current user and guide version", () => {
  const saved = JSON.stringify({ userId: "a", version: 2, step: 3 });
  assert.equal(tourProgress(saved, "a", 2, 7), 3);
  for (const value of [
    saved,
    "broken",
    null,
    JSON.stringify({ userId: "b", version: 2, step: 1 }),
    JSON.stringify({ userId: "a", version: 1, step: 1 }),
    JSON.stringify({ userId: "a", version: 2, step: 9 }),
    JSON.stringify({ userId: "a", version: 2, step: -1 }),
    JSON.stringify({ userId: "a", version: 2, step: 1.5 }),
  ])
    if (value !== saved) assert.equal(tourProgress(value, "a", 2, 7), null);
  assert.equal(tourProgress(saved, "b", 2, 7), null);
});
