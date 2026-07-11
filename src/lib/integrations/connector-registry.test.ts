import assert from "node:assert/strict";
import test from "node:test";
import { connectorRegistry } from "@/lib/integrations/connector-registry";

test("connector registry distinguishes live, migration, adapter-ready, and planned connections", () => {
  assert.equal(connectorRegistry.find((item) => item.id === "meta_lead_ads")?.availability, "available");
  assert.equal(connectorRegistry.find((item) => item.id === "hubspot")?.availability, "mapped_import");
  assert.equal(connectorRegistry.find((item) => item.id === "custom_email")?.availability, "adapter_ready");
  assert.equal(connectorRegistry.find((item) => item.id === "whatsapp_business")?.availability, "planned");
  assert.equal(new Set(connectorRegistry.map((item) => item.id)).size, connectorRegistry.length);
});
