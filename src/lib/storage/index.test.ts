import assert from "node:assert/strict";
import test from "node:test";
import { createLeadStore, getLeadStore, leadStore, PostgresLeadStore } from "@/lib/storage";
import { NeonLeadStore } from "@/lib/storage/neon-store";

test("storage factory returns the current Postgres-backed implementation", () => {
  const store = createLeadStore();

  assert.equal(store instanceof NeonLeadStore, true);
  assert.equal(store instanceof PostgresLeadStore, true);
});

test("getLeadStore returns the shared store instance used by the app boundary", () => {
  const shared = getLeadStore();

  assert.equal(shared, leadStore);
  assert.equal(shared, getLeadStore());
});
