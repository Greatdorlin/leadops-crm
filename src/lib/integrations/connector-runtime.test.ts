import assert from "node:assert/strict";
import test from "node:test";
import {
  getConnectorSetupState,
  isConnectorConfigured,
  isConnectorOperationConfigured,
} from "@/lib/integrations/connector-runtime";

test("connector setup requires every server-side secret", () => {
  assert.equal(isConnectorConfigured("tiktok", {}), false);
  assert.equal(isConnectorConfigured("tiktok", { TIKTOK_WEBHOOK_SECRET: "secret" }), true);
  assert.equal(
    isConnectorConfigured("facebook", {
      META_APP_SECRET: "secret",
      META_PAGE_ACCESS_TOKEN: "token",
      META_VERIFY_TOKEN: "verify",
    }),
    true,
  );
  assert.equal(getConnectorSetupState("mailchimp", {}), false);
  assert.equal(isConnectorConfigured("sender", {}), false);
});

test("Google Ads reporting action requires reporting credentials, not only webhook intake", () => {
  const webhookOnly = { GOOGLE_ADS_WEBHOOK_KEY: "webhook" };
  assert.equal(isConnectorConfigured("google_ads", webhookOnly), true);
  assert.equal(
    isConnectorOperationConfigured(
      "google_ads",
      "/api/integrations/google-ads/sync-performance",
      webhookOnly,
    ),
    false,
  );
});

test("catalog entries without a verifiable runtime are not presented as configured", () => {
  assert.equal(getConnectorSetupState("website_forms", {}), false);
  assert.equal(getConnectorSetupState("custom_webhook", {}), false);
});
