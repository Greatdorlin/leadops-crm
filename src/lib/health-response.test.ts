import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHealthResponse,
  isHealthReady,
  type HealthChecks,
} from "@/lib/health-response";

const checks: HealthChecks = {
  databaseConfigured: true,
  databaseReachable: true,
  authSecretConfigured: true,
  googleAuthEnabled: false,
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

  assert.equal("environment" in response && response.environment, "development");
  assert.deepEqual("checks" in response ? response.checks : null, checks);
});

test("production readiness keeps Google optional but validates it when enabled", () => {
  assert.equal(isHealthReady("production", checks), true);
  assert.equal(
    isHealthReady("production", {
      ...checks,
      googleAuthEnabled: true,
      googleAuthConfigured: false,
    }),
    false,
  );
  assert.equal(
    isHealthReady("production", {
      ...checks,
      googleAuthEnabled: true,
      googleAuthConfigured: true,
    }),
    true,
  );
});
