import assert from "node:assert/strict";
import test from "node:test";
import { readBoundedBody, readBoundedJsonObject } from "@/lib/http/bounded-body";

test("bounded body rejects a declared oversized payload before reading", async () => {
  const request = new Request("https://leads.test/intake", {
    method: "POST",
    headers: { "content-length": "20" },
    body: "{}",
  });

  assert.deepEqual(await readBoundedBody(request, 10), {
    ok: false,
    status: 413,
    error: "Payload is too large.",
  });
});

test("bounded body rejects a streamed payload beyond the limit", async () => {
  const request = new Request("https://leads.test/intake", {
    method: "POST",
    body: "12345678901",
  });

  assert.equal((await readBoundedBody(request, 10)).status, 413);
});

test("bounded JSON accepts objects and rejects arrays", async () => {
  const objectRequest = new Request("https://leads.test/intake", {
    method: "POST",
    body: JSON.stringify({ email: "lead@example.com" }),
  });
  const arrayRequest = new Request("https://leads.test/intake", {
    method: "POST",
    body: "[]",
  });

  assert.deepEqual(await readBoundedJsonObject(objectRequest), {
    ok: true,
    value: { email: "lead@example.com" },
  });
  assert.equal((await readBoundedJsonObject(arrayRequest)).status, 400);
});
