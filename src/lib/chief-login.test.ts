import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import {
  resetChiefLoginRateLimitsForTest,
  verifyChiefLogin,
} from "./chief-login";

const chiefEnvironmentKeys = [
  "AUTH_SECRET",
  "CHIEF_LOGIN_EMAIL",
  "CHIEF_LOGIN_PASSWORD_HASH",
  "ENABLE_PASSWORD_LOGIN",
  "INITIAL_ADMIN_EMAIL",
  "INITIAL_ADMIN_NAME",
] as const;

function restoreEnvironment(previous: Record<string, string | undefined>) {
  for (const key of chiefEnvironmentKeys) {
    if (previous[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = previous[key];
    }
  }
}

test("chief login only verifies the configured owner and clears failures after success", async () => {
  const previous = Object.fromEntries(
    chiefEnvironmentKeys.map((key) => [key, process.env[key]]),
  );

  process.env.AUTH_SECRET = "test-secret";
  process.env.CHIEF_LOGIN_EMAIL = "owner@example.com";
  process.env.CHIEF_LOGIN_PASSWORD_HASH = await bcrypt.hash("test-password", 4);
  process.env.ENABLE_PASSWORD_LOGIN = "true";
  process.env.INITIAL_ADMIN_EMAIL = "owner@example.com";
  process.env.INITIAL_ADMIN_NAME = "Owner";
  resetChiefLoginRateLimitsForTest();

  try {
    assert.equal(await verifyChiefLogin("other@example.com", "test-password"), null);
    assert.equal(await verifyChiefLogin("owner@example.com", "wrong-password"), null);
    assert.deepEqual(await verifyChiefLogin("OWNER@example.com", "test-password"), {
      email: "owner@example.com",
      id: "owner@example.com",
      name: "Owner",
    });
  } finally {
    resetChiefLoginRateLimitsForTest();
    restoreEnvironment(previous);
  }
});

test("chief login locks after repeated failed access attempts", async () => {
  const previous = Object.fromEntries(
    chiefEnvironmentKeys.map((key) => [key, process.env[key]]),
  );

  process.env.AUTH_SECRET = "test-secret";
  process.env.CHIEF_LOGIN_EMAIL = "owner@example.com";
  process.env.CHIEF_LOGIN_PASSWORD_HASH = await bcrypt.hash("test-password", 4);
  process.env.ENABLE_PASSWORD_LOGIN = "true";
  process.env.INITIAL_ADMIN_EMAIL = "owner@example.com";
  process.env.INITIAL_ADMIN_NAME = "Owner";
  resetChiefLoginRateLimitsForTest();

  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      assert.equal(await verifyChiefLogin("owner@example.com", "wrong-password"), null);
    }

    assert.equal(await verifyChiefLogin("owner@example.com", "test-password"), null);
  } finally {
    resetChiefLoginRateLimitsForTest();
    restoreEnvironment(previous);
  }
});
