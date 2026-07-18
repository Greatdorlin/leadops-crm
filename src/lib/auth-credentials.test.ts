import assert from "node:assert/strict";
import test from "node:test";
import {
  createInvitationToken,
  getActivationBaseUrl,
  getInvitationTtlHours,
  hashInvitationToken,
  validateNewPassword,
} from "./auth-credentials";

test("invitation tokens expose only a random value and store a stable SHA-256 hash", () => {
  const first = createInvitationToken();
  const second = createInvitationToken();

  assert.match(first.token, /^[a-f0-9]{64}$/);
  assert.match(first.tokenHash, /^[a-f0-9]{64}$/);
  assert.equal(hashInvitationToken(first.token), first.tokenHash);
  assert.notEqual(first.token, first.tokenHash);
  assert.notEqual(first.token, second.token);
});

test("new passwords require a bounded length, a letter, and a number", () => {
  assert.equal(validateNewPassword("correct-horse-7"), true);
  assert.equal(validateNewPassword("allletterslong"), false);
  assert.equal(validateNewPassword("123456789012"), false);
  assert.equal(validateNewPassword("Short7"), false);
  assert.equal(validateNewPassword(`Valid7${"x".repeat(123)}`), false);
});

test("invitation expiry is bounded and defaults safely", () => {
  assert.equal(getInvitationTtlHours("24"), 24);
  assert.equal(getInvitationTtlHours("0"), 72);
  assert.equal(getInvitationTtlHours("169"), 72);
  assert.equal(getInvitationTtlHours("invalid"), 72);
});

test("activation links use only a configured valid origin", () => {
  assert.equal(
    getActivationBaseUrl({ NEXTAUTH_URL: "https://crm.example.com/path" } as NodeJS.ProcessEnv),
    "https://crm.example.com",
  );
  assert.equal(getActivationBaseUrl({ NEXTAUTH_URL: "not a url" } as NodeJS.ProcessEnv), null);
  assert.equal(getActivationBaseUrl({} as NodeJS.ProcessEnv), null);
});
