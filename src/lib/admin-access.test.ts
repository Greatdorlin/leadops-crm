import assert from "node:assert/strict";
import test from "node:test";
import { canExportLeadData, getLeadExportAllowedEmails } from "./admin-access";

test("lead export defaults to flyconnect102@gmail.com", () => {
  const previous = process.env.LEAD_EXPORT_ALLOWED_EMAILS;

  delete process.env.LEAD_EXPORT_ALLOWED_EMAILS;

  assert.deepEqual(getLeadExportAllowedEmails(), ["flyconnect102@gmail.com"]);
  assert.equal(canExportLeadData("flyconnect102@gmail.com"), true);
  assert.equal(canExportLeadData("greatdorlinwisdom@gmail.com"), true);
  assert.equal(canExportLeadData("socialmedia.flyconnect102@gmail.com"), false);

  if (previous === undefined) {
    delete process.env.LEAD_EXPORT_ALLOWED_EMAILS;
  } else {
    process.env.LEAD_EXPORT_ALLOWED_EMAILS = previous;
  }
});

test("lead export respects configured env allowlist", () => {
  const previous = process.env.LEAD_EXPORT_ALLOWED_EMAILS;

  process.env.LEAD_EXPORT_ALLOWED_EMAILS = "owner@example.com, manager@example.com ";

  assert.deepEqual(getLeadExportAllowedEmails(), ["owner@example.com", "manager@example.com"]);
  assert.equal(canExportLeadData("OWNER@example.com"), true);
  assert.equal(canExportLeadData("greatdorlinwisdom@gmail.com"), true);
  assert.equal(canExportLeadData("someone@example.com"), false);

  if (previous === undefined) {
    delete process.env.LEAD_EXPORT_ALLOWED_EMAILS;
  } else {
    process.env.LEAD_EXPORT_ALLOWED_EMAILS = previous;
  }
});
