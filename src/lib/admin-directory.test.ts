import assert from "node:assert/strict";
import test from "node:test";
import { canAccessAdminWorkspace } from "./admin-directory";

test("an explicitly invited active user bypasses the optional domain restriction", () => {
  assert.equal(
    canAccessAdminWorkspace({
      hasActiveStoredUser: true,
      isInitialAdmin: false,
      isEmailDomainAllowed: false,
    }),
    true,
  );
});

test("the initial bootstrap identity remains subject to the domain restriction", () => {
  assert.equal(
    canAccessAdminWorkspace({
      hasActiveStoredUser: true,
      isInitialAdmin: true,
      isEmailDomainAllowed: false,
    }),
    false,
  );
  assert.equal(
    canAccessAdminWorkspace({
      hasActiveStoredUser: false,
      isInitialAdmin: true,
      isEmailDomainAllowed: false,
    }),
    false,
  );
  assert.equal(
    canAccessAdminWorkspace({
      hasActiveStoredUser: false,
      isInitialAdmin: true,
      isEmailDomainAllowed: true,
    }),
    true,
  );
});
