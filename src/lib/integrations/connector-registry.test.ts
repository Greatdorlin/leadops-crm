import assert from "node:assert/strict";
import test from "node:test";
import { connectorRegistry } from "@/lib/integrations/connector-registry";

test("connector registry distinguishes live, migration, adapter-ready, and planned connections", () => {
  assert.equal(connectorRegistry.find((item) => item.id === "meta_lead_ads")?.availability, "available");
  assert.equal(connectorRegistry.find((item) => item.id === "custom_webhook")?.availability, "available");
  assert.equal(connectorRegistry.find((item) => item.id === "hubspot")?.availability, "mapped_import");
  assert.equal(connectorRegistry.find((item) => item.id === "custom_email")?.availability, "adapter_ready");
  assert.equal(connectorRegistry.find((item) => item.id === "sender")?.availability, "adapter_ready");
  assert.equal(connectorRegistry.find((item) => item.id === "whatsapp_business")?.availability, "planned");
  assert.equal(new Set(connectorRegistry.map((item) => item.id)).size, connectorRegistry.length);
});

test("every live connector links to setup and health, with retries linked where implemented", () => {
  const liveConnectors = connectorRegistry.filter((item) => item.availability === "available");
  for (const connector of liveConnectors) {
    assert.ok(connector.operations?.setupPath, `${connector.id} needs a setup path`);
    assert.ok(connector.operations?.healthPath, `${connector.id} needs a health path`);
  }

  for (const id of ["meta_lead_ads", "google_ads", "tiktok", "linkedin"]) {
    const connector = connectorRegistry.find((item) => item.id === id);
    assert.match(connector?.operations?.retryPath ?? "", /#failed-imports$/);
  }
});

test("adapter-ready and planned connectors do not expose activation paths", () => {
  const inactiveConnectors = connectorRegistry.filter((item) =>
    ["adapter_ready", "planned"].includes(item.availability),
  );

  for (const connector of inactiveConnectors) {
    assert.equal(connector.operations, undefined, `${connector.id} must not link to activation`);
  }
});
