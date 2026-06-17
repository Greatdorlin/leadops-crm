import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "@/app/api/integrations/tiktok/webhook/route";
import { leadStore } from "@/lib/storage";
import { getTikTokLeadAttribution, mapTikTokLeadToExternalInput } from "./map-lead";
import { processTikTokPayload } from "./process-payload";

function buildTikTokPayload(overrides: Record<string, unknown> = {}) {
  return {
    lead_id: "tt-lead-1",
    form_id: "tt-form-1",
    campaign_id: "tt-campaign-1",
    adgroup_id: "tt-adgroup-1",
    ad_id: "tt-ad-1",
    created_time: "2026-06-09T06:00:00Z",
    field_data: [
      { name: "full_name", value: "Bola Ade" },
      { name: "email", value: "bola@example.com" },
      { name: "phone_number", value: "+2348000000202" },
      { name: "state", value: "Abuja" },
    ],
    ...overrides,
  };
}

test("tiktok webhook rejects requests when the webhook secret is not configured", async () => {
  const previousSecret = process.env.TIKTOK_WEBHOOK_SECRET;
  delete process.env.TIKTOK_WEBHOOK_SECRET;

  try {
    const response = await POST(
      new Request("https://example.com/api/integrations/tiktok/webhook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildTikTokPayload()),
      }),
    );

    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      error: "TikTok webhook secret is not configured.",
    });
  } finally {
    process.env.TIKTOK_WEBHOOK_SECRET = previousSecret;
  }
});

test("tiktok webhook rejects requests with an invalid secret", async () => {
  const previousSecret = process.env.TIKTOK_WEBHOOK_SECRET;
  process.env.TIKTOK_WEBHOOK_SECRET = "expected-secret";

  try {
    const response = await POST(
      new Request("https://example.com/api/integrations/tiktok/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-tiktok-webhook-secret": "wrong-secret",
        },
        body: JSON.stringify(buildTikTokPayload()),
      }),
    );

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "Forbidden." });
  } finally {
    process.env.TIKTOK_WEBHOOK_SECRET = previousSecret;
  }
});

test("tiktok webhook returns a safe error for malformed JSON", async () => {
  const previousSecret = process.env.TIKTOK_WEBHOOK_SECRET;
  process.env.TIKTOK_WEBHOOK_SECRET = "expected-secret";

  try {
    const response = await POST(
      new Request("https://example.com/api/integrations/tiktok/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-tiktok-webhook-secret": "expected-secret",
        },
        body: "{invalid-json",
      }),
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Invalid JSON payload." });
  } finally {
    process.env.TIKTOK_WEBHOOK_SECRET = previousSecret;
  }
});

test("mapTikTokLeadToExternalInput handles flexible TikTok payload fields", () => {
  const payload = buildTikTokPayload({
    data: {
      form_id: "tt-form-2",
    },
  });
  const mapped = mapTikTokLeadToExternalInput(payload);
  const attribution = getTikTokLeadAttribution(payload);

  assert.equal(attribution.leadId, "tt-lead-1");
  assert.equal(attribution.formId, "tt-form-1");
  assert.equal(attribution.campaignId, "tt-campaign-1");
  assert.equal(mapped.source, "tiktok_lead_ads");
  assert.equal(mapped.externalLeadId, "tt-lead-1");
  assert.equal(mapped.externalFormId, "tt-form-1");
  assert.equal(mapped.firstName, "Bola");
  assert.equal(mapped.lastName, "Ade");
  assert.equal(mapped.email, "bola@example.com");
  assert.equal(mapped.whatsappNumber, "+2348000000202");
  assert.equal(mapped.state, "Abuja");
});

test("processTikTokPayload upserts leads and preserves attribution on duplicate imports", async (t) => {
  let createdFlag: boolean | undefined;
  let receivedEvent: Record<string, unknown> | null | undefined;

  t.mock.method(leadStore, "upsertExternalLead", async () => ({
    lead: {
      id: "lead-tt-1",
      externalLeadId: "tt-lead-1",
    },
    created: false,
    duplicateOfId: "lead-tt-1",
  }) as Awaited<ReturnType<typeof leadStore.upsertExternalLead>>);
  t.mock.method(leadStore, "addLeadEvent", async (input) => {
    createdFlag = input.eventData?.created as boolean | undefined;
    receivedEvent = input.eventData;
    return {
      id: "event-tt-1",
      leadId: input.leadId,
      eventType: input.eventType,
      eventData: input.eventData ?? null,
      createdBy: null,
      createdAt: new Date().toISOString(),
    };
  });
  t.mock.method(leadStore, "markPayloadProcessed", async () => null);

  const result = await processTikTokPayload("payload-tt-1", buildTikTokPayload());

  assert.equal(result.processed, 1);
  assert.equal(createdFlag, false);
  assert.equal(receivedEvent?.campaignId, "tt-campaign-1");
  assert.equal(receivedEvent?.createdTime, "2026-06-09T06:00:00Z");
});
