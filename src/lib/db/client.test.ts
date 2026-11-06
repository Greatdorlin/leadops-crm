import assert from "node:assert/strict";
import test from "node:test";
import { closeDb } from "./client";

test("CLI shutdown drains a cached connection once and clears its database reference", async () => {
  let closed = 0;
  Object.assign(globalThis, {
    __leadsDeskDb: {},
    __leadsDeskPostgres: { end: async (options: { timeout: number }) => { assert.equal(options.timeout, 5); closed++; } },
  });
  await closeDb();
  await closeDb();
  assert.equal(closed, 1);
  assert.equal(Reflect.get(globalThis, "__leadsDeskDb"), undefined);
  assert.equal(Reflect.get(globalThis, "__leadsDeskPostgres"), undefined);
});

test("failed shutdown propagates failure without retaining a stale client", async () => {
  Object.assign(globalThis, { __leadsDeskPostgres: { end: async () => { throw new Error("shutdown failed"); } } });
  await assert.rejects(closeDb(), /shutdown failed/);
  await closeDb();
  assert.equal(Reflect.get(globalThis, "__leadsDeskPostgres"), undefined);
});
