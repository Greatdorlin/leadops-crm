import assert from "node:assert/strict";
import test from "node:test";
import {
  canExportLeadData,
  getAdminAllowedEmails,
  getLeadExportAllowedEmails,
  isAdminAuthConfigured,
  isEmailDomainAllowed,
  isGoogleAuthConfigured,
  isLocalAdminPreviewEmail,
  isLocalAdminPreviewEnabled,
} from "./admin-access";

function setNodeEnvForTest(value: string | undefined) {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, "NODE_ENV");
    return;
  }

  Object.defineProperty(process.env, "NODE_ENV", {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

test("lead export has no personal fallback when no allowlist is configured", () => {
  const previous = process.env.LEAD_EXPORT_ALLOWED_EMAILS;
  const previousInitialAdminEmail = process.env.INITIAL_ADMIN_EMAIL;

  delete process.env.LEAD_EXPORT_ALLOWED_EMAILS;
  delete process.env.INITIAL_ADMIN_EMAIL;

  assert.deepEqual(getLeadExportAllowedEmails(), []);
  assert.equal(canExportLeadData("owner@example.com"), false);
  assert.equal(canExportLeadData("rep@example.com"), false);

  if (previous === undefined) {
    delete process.env.LEAD_EXPORT_ALLOWED_EMAILS;
  } else {
    process.env.LEAD_EXPORT_ALLOWED_EMAILS = previous;
  }

  if (previousInitialAdminEmail === undefined) {
    delete process.env.INITIAL_ADMIN_EMAIL;
  } else {
    process.env.INITIAL_ADMIN_EMAIL = previousInitialAdminEmail;
  }
});

test("lead export respects env allowlist and the initial admin bootstrap email", () => {
  const previous = process.env.LEAD_EXPORT_ALLOWED_EMAILS;
  const previousInitialAdminEmail = process.env.INITIAL_ADMIN_EMAIL;

  process.env.LEAD_EXPORT_ALLOWED_EMAILS = "owner@example.com, manager@example.com ";
  process.env.INITIAL_ADMIN_EMAIL = "bootstrap@example.com";

  assert.deepEqual(getLeadExportAllowedEmails(), ["owner@example.com", "manager@example.com"]);
  assert.equal(canExportLeadData("OWNER@example.com"), true);
  assert.equal(canExportLeadData("bootstrap@example.com"), true);
  assert.equal(canExportLeadData("someone@example.com"), false);

  if (previous === undefined) {
    delete process.env.LEAD_EXPORT_ALLOWED_EMAILS;
  } else {
    process.env.LEAD_EXPORT_ALLOWED_EMAILS = previous;
  }

  if (previousInitialAdminEmail === undefined) {
    delete process.env.INITIAL_ADMIN_EMAIL;
  } else {
    process.env.INITIAL_ADMIN_EMAIL = previousInitialAdminEmail;
  }
});

test("admin allowlist includes the initial admin email and respects domain restrictions", () => {
  const previousInitialAdminEmail = process.env.INITIAL_ADMIN_EMAIL;
  const previousAllowedAdmins = process.env.ADMIN_ALLOWED_EMAILS;
  const previousAllowedDomains = process.env.ALLOWED_EMAIL_DOMAINS;

  process.env.INITIAL_ADMIN_EMAIL = "owner@example.com";
  process.env.ADMIN_ALLOWED_EMAILS = "admin@example.com, manager@example.com";
  process.env.ALLOWED_EMAIL_DOMAINS = "example.com, team.example.com ";

  assert.deepEqual(getAdminAllowedEmails(), [
    "owner@example.com",
    "admin@example.com",
    "manager@example.com",
  ]);
  assert.equal(isEmailDomainAllowed("admin@example.com"), true);
  assert.equal(isEmailDomainAllowed("rep@team.example.com"), true);
  assert.equal(isEmailDomainAllowed("rep@outside.com"), false);

  if (previousInitialAdminEmail === undefined) {
    delete process.env.INITIAL_ADMIN_EMAIL;
  } else {
    process.env.INITIAL_ADMIN_EMAIL = previousInitialAdminEmail;
  }

  if (previousAllowedAdmins === undefined) {
    delete process.env.ADMIN_ALLOWED_EMAILS;
  } else {
    process.env.ADMIN_ALLOWED_EMAILS = previousAllowedAdmins;
  }

  if (previousAllowedDomains === undefined) {
    delete process.env.ALLOWED_EMAIL_DOMAINS;
  } else {
    process.env.ALLOWED_EMAIL_DOMAINS = previousAllowedDomains;
  }
});

test("local admin preview is disabled in production", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  setNodeEnvForTest("production");

  assert.equal(isLocalAdminPreviewEnabled(), false);

  setNodeEnvForTest(previousNodeEnv);
});

test("local admin preview remains available outside production", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  setNodeEnvForTest("development");

  assert.equal(isLocalAdminPreviewEnabled(), true);

  setNodeEnvForTest(previousNodeEnv);
});

test("local preview identity is exact and never enabled in production", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  setNodeEnvForTest("development");

  assert.equal(isLocalAdminPreviewEmail("PREVIEW@local.leadsdesk.test"), true);
  assert.equal(isLocalAdminPreviewEmail("owner@example.com"), false);

  setNodeEnvForTest("production");
  assert.equal(isLocalAdminPreviewEmail("preview@local.leadsdesk.test"), false);

  setNodeEnvForTest(previousNodeEnv);
});

test("email authentication requires the database, secret, and initial admin identity", () => {
  const environment = {
    AUTH_SECRET: "test-secret",
    DATABASE_URL: "postgresql://example.test/leads-desk",
    INITIAL_ADMIN_EMAIL: "owner@example.com",
    INITIAL_ADMIN_NAME: "Owner",
    NODE_ENV: "test",
  } as NodeJS.ProcessEnv;

  assert.equal(isAdminAuthConfigured(environment), true);
  delete environment.DATABASE_URL;
  assert.equal(isAdminAuthConfigured(environment), false);
});

test("Google login remains disabled unless explicitly enabled", () => {
  const environment = {
    AUTH_GOOGLE_ID: "client-id",
    AUTH_GOOGLE_SECRET: "client-secret",
    NODE_ENV: "test",
  } as NodeJS.ProcessEnv;

  assert.equal(isGoogleAuthConfigured(environment), false);
  environment.ENABLE_GOOGLE_LOGIN = "true";
  assert.equal(isGoogleAuthConfigured(environment), true);
  delete environment.AUTH_GOOGLE_SECRET;
  assert.equal(isGoogleAuthConfigured(environment), false);
});
