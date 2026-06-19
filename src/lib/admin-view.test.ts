import assert from "node:assert/strict";
import test from "node:test";
import { resolveEffectiveAdminAccessLevel } from "@/lib/admin-view";

test("master admin can preview a narrower access view", () => {
  const previousInitialAdminEmail = process.env.INITIAL_ADMIN_EMAIL;
  process.env.INITIAL_ADMIN_EMAIL = "owner@example.com";

  assert.equal(
    resolveEffectiveAdminAccessLevel({
      actualAccessLevel: "master_admin",
      email: "owner@example.com",
      requestedAccessLevel: "sales_rep",
    }),
    "sales_rep",
  );

  if (previousInitialAdminEmail === undefined) {
    delete process.env.INITIAL_ADMIN_EMAIL;
  } else {
    process.env.INITIAL_ADMIN_EMAIL = previousInitialAdminEmail;
  }
});

test("non-master admin cannot override access view", () => {
  assert.equal(
    resolveEffectiveAdminAccessLevel({
      actualAccessLevel: "general_admin",
      email: "team@example.com",
      requestedAccessLevel: "master_admin",
    }),
    "general_admin",
  );
});
