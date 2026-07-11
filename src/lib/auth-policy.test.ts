import assert from "node:assert/strict";
import test from "node:test";
import { isVerifiedGoogleProfile } from "@/lib/auth-policy";

test("Google sign-in requires an explicitly verified email", () => {
  assert.equal(isVerifiedGoogleProfile({ email_verified: true }), true);
  assert.equal(isVerifiedGoogleProfile({ email_verified: false }), false);
  assert.equal(isVerifiedGoogleProfile({}), false);
  assert.equal(isVerifiedGoogleProfile(null), false);
});
