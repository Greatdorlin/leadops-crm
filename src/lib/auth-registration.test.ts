import assert from "node:assert/strict";
import test from "node:test";
import {
  canRegisterWithApprovedDomain,
  getRegistrationEmailDomain,
  normalizeApprovedRegistrationDomains,
} from "./auth-registration-policy";

test("approved registration domains are normalized, deduplicated, and validated", () => {
  assert.deepEqual(
    normalizeApprovedRegistrationDomains([
      " Example.COM ",
      "@team.example.com",
      "example.com",
      "https://example.com",
      "localhost",
    ]),
    ["example.com", "team.example.com"],
  );
});

test("registration remains closed unless enabled for the exact email domain", () => {
  const policy = { enabled: true, approvedDomains: ["example.com"] };

  assert.equal(canRegisterWithApprovedDomain(policy, "rep@example.com"), true);
  assert.equal(canRegisterWithApprovedDomain(policy, "rep@sub.example.com"), false);
  assert.equal(canRegisterWithApprovedDomain({ ...policy, enabled: false }, "rep@example.com"), false);
  assert.equal(canRegisterWithApprovedDomain(policy, "rep@notexample.com"), false);
});

test("email domain parsing rejects malformed identities", () => {
  assert.equal(getRegistrationEmailDomain(" Rep@Example.com "), "example.com");
  assert.equal(getRegistrationEmailDomain("missing-domain@"), null);
  assert.equal(getRegistrationEmailDomain("not-an-email"), null);
});
