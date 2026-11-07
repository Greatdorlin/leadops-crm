import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "./route";

test("password changes reject missing or foreign origins before looking up a session", async () => {
  for (const origin of [undefined, "https://attacker.example", "null"]) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (origin) headers.Origin = origin;
    const response = await POST(new Request("https://crm.example/api/auth/change-password", {
      method: "POST", headers, body: JSON.stringify({ currentPassword: "old", newPassword: "new" }),
    }));
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "Request not allowed." });
  }
});
