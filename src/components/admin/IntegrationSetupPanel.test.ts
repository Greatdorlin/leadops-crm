import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { IntegrationSetupPanel } from "./IntegrationSetupPanel";

test("integration setup keeps the client URL copyable and technical details collapsed", () => {
  const html = renderToStaticMarkup(createElement(IntegrationSetupPanel, {
    provider: "facebook",
    title: "Connect Meta",
    description: "Receive leads.",
    configured: false,
    callbackUrl: "https://crm.client.example/api/integrations/facebook/webhook",
    permissions: ["Read leads"],
    steps: [{ title: "Credentials", description: "Configure provider credentials." }],
  }));
  assert.match(html, /Copy your webhook URL/);
  assert.match(html, /https:\/\/crm.client.example\/api\/integrations\/facebook\/webhook/);
  assert.match(html, /Technical setup/);
  assert.doesNotMatch(html, /<details[^>]*\bopen/);
});
