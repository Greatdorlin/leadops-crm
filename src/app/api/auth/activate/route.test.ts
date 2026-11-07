import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "./route";

test("activation rejects oversized UTF-8 passwords before consuming an invitation", async () => {
  for (const password of [`A1${"x".repeat(71)}`, `A1${"😀".repeat(18)}`]) {
    const response = await POST(new Request("https://crm.example/api/auth/activate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "synthetic-test-token", password }),
    }));
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "This password is too long. Try a shorter passphrase." });
  }
});
