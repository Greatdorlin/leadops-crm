import assert from "node:assert/strict";
import test from "node:test";
import type { SalesTargetScope } from "@/lib/crm/domain";
import {
  resolveSalesTargetForUser,
  type AdminSalesTargetRecord,
  type SalesTargetUserScope,
} from "@/lib/crm/sales-targets-admin";

function createTarget(
  scope: SalesTargetScope,
  scopeId: string | null,
  overrides: Partial<AdminSalesTargetRecord> = {},
): AdminSalesTargetRecord {
  return {
    id: overrides.id ?? `${scope}-target`,
    name: overrides.name ?? `${scope} target`,
    scope,
    scopeId,
    period: overrides.period ?? "monthly",
    targetValue: overrides.targetValue ?? 100_000,
    currency: overrides.currency ?? "NGN",
    startDate: overrides.startDate ?? "2026-07-01",
    endDate: overrides.endDate ?? "2026-07-31",
    isActive: overrides.isActive ?? true,
    archived: overrides.archived ?? false,
    createdAt: overrides.createdAt ?? "2026-07-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-07-01T00:00:00.000Z",
  };
}

const user: SalesTargetUserScope = {
  id: "user-1",
  teamId: "team-1",
  departmentId: "department-1",
  branchId: "branch-1",
};

test("sales target resolution uses user, team, department, branch, then global precedence", () => {
  const targets = [
    createTarget("global", null),
    createTarget("branch", "branch-1"),
    createTarget("department", "department-1"),
    createTarget("team", "team-1"),
    createTarget("user", "user-1"),
  ];
  const now = new Date("2026-07-18T12:00:00.000Z");

  assert.equal(resolveSalesTargetForUser(targets, user, now)?.scope, "user");
  assert.equal(
    resolveSalesTargetForUser(targets.filter((target) => target.scope !== "user"), user, now)?.scope,
    "team",
  );
  assert.equal(
    resolveSalesTargetForUser(
      targets.filter((target) => target.scope !== "user" && target.scope !== "team"),
      user,
      now,
    )?.scope,
    "department",
  );
  assert.equal(
    resolveSalesTargetForUser(
      targets.filter((target) => !["user", "team", "department"].includes(target.scope)),
      user,
      now,
    )?.scope,
    "branch",
  );
  assert.equal(
    resolveSalesTargetForUser(
      targets.filter((target) => target.scope === "global"),
      user,
      now,
    )?.scope,
    "global",
  );
});

test("sales target resolution rejects mismatched, inactive, archived, and out-of-range targets", () => {
  const targets = [
    createTarget("user", "another-user"),
    createTarget("team", "team-1", { isActive: false }),
    createTarget("department", "department-1", { archived: true }),
    createTarget("branch", "branch-1", { endDate: "2026-07-17" }),
    createTarget("global", null, { startDate: "2026-07-19" }),
  ];

  assert.equal(
    resolveSalesTargetForUser(targets, user, new Date("2026-07-18T12:00:00.000Z")),
    null,
  );
});

test("sales target resolution uses the newest target within the same scope", () => {
  const older = createTarget("team", "team-1", {
    id: "older",
    createdAt: "2026-07-01T00:00:00.000Z",
  });
  const newer = createTarget("team", "team-1", {
    id: "newer",
    createdAt: "2026-07-10T00:00:00.000Z",
  });

  assert.equal(
    resolveSalesTargetForUser(
      [older, newer],
      user,
      new Date("2026-07-18T12:00:00.000Z"),
    )?.id,
    "newer",
  );
});
