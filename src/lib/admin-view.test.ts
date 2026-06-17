import assert from "node:assert/strict";
import test from "node:test";
import { resolveEffectiveAdminAccessLevel } from "@/lib/admin-view";

test("master admin can preview a narrower access view", () => {
  assert.equal(
    resolveEffectiveAdminAccessLevel({
      actualAccessLevel: "master_admin",
      email: "greatdorlinwisdom@gmail.com",
      requestedAccessLevel: "sales_rep",
    }),
    "sales_rep",
  );
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
