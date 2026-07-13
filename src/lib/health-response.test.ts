import assert from "node:assert/strict";
import test from "node:test";
import { buildHealthResponse, type HealthChecks } from "@/lib/health-response";

const checks: HealthChecks = {
  databaseConfigured: true,
  databaseReachable: true,
  authSecretConfigured: true,
  googleAuthConfigured: true,
  initialAdminConfigured: true,
  allowedDomainRestrictionEnabled: false,
  devPreviewEnabled: false,
};

test("production health responses do not disclose configuration details", () => {
  const response = buildHealthResponse({
    environment: "production",
    ok: true,
    timestamp: "2026-07-13T00:00:00.000Z",
    checks,
  });

  assert.deepEqual(response, {
    ok: true,
    service: "Leads Desk",
    timestamp: "2026-07-13T00:00:00.000Z",
  });
});

test("development health responses retain actionable local diagnostics", () => {
  const response = buildHealthResponse({
    environment: "development",
    ok: false,
    timestamp: "2026-07-13T00:00:00.000Z",
    checks,
  });

  assert.equal(response.environment, "development");
  assert.deepEqual(response.checks, checks);
});
