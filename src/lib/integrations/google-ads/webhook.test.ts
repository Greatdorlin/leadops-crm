import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "@/app/api/integrations/google-ads/webhook/route";
import { leadStore } from "@/lib/storage";
import type { ExternalLeadUpsertInput, LeadEventCreateInput } from "@/lib/storage/types";
import { mapGoogleAdsLeadToExternalInput, type GoogleAdsLeadWebhookPayload } from "./map-lead";
import { processGoogleAdsPayload } from "./process-payload";

function buildGooglePayload(
  overrides: Partial<GoogleAdsLeadWebhookPayload> = {},
): GoogleAdsLeadWebhookPayload {
  return {
    lead_id: "google-lead-1",
    form_id: "form-1",
    form_name: "Abuja Intake Form",
    campaign_id: "campaign-1",
    campaign_name: "June Growth Push",
    adgroup_id: "adgroup-1",
    creative_id: "creative-1",
    gcl_id: "gclid-1",
    user_column_data: [
      { column_id: "FULL_NAME", string_value: "Ada Traveler" },
      { column_id: "EMAIL", string_value: "ada@example.com" },
      { column_id: "PHONE_NUMBER", string_value: "+2348000000101" },
      { column_id: "REGION", string_value: "Lagos" },
    ],
    ...overrides,
  };
}

test("google ads webhook rejects requests when the webhook key is not configured", async () => {
  const previousKey = process.env.GOOGLE_ADS_WEBHOOK_KEY;
  delete process.env.GOOGLE_ADS_WEBHOOK_KEY;

  try {
    const response = await POST(
      new Request("https://example.com/api/integrations/google-ads/webhook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildGooglePayload()),
      }),
    );

    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      error: "Google Ads webhook key is not configured.",
    });
  } finally {
    process.env.GOOGLE_ADS_WEBHOOK_KEY = previousKey;
  }
});

test("google ads webhook rejects requests with an invalid key", async () => {
  const previousKey = process.env.GOOGLE_ADS_WEBHOOK_KEY;
  process.env.GOOGLE_ADS_WEBHOOK_KEY = "expected-key";

  try {
    const response = await POST(
      new Request("https://example.com/api/integrations/google-ads/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-google-ads-webhook-key": "wrong-key",
        },
        body: JSON.stringify(buildGooglePayload()),
      }),
    );

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "Forbidden." });
  } finally {
    process.env.GOOGLE_ADS_WEBHOOK_KEY = previousKey;
  }
});

test("mapGoogleAdsLeadToExternalInput maps Google Ads lead fields into CRM input", () => {
  const mapped = mapGoogleAdsLeadToExternalInput(buildGooglePayload());

  assert.equal(mapped.source, "google_ads");
  assert.equal(mapped.sourceDetail, "Abuja Intake Form");
  assert.equal(mapped.externalLeadId, "google-lead-1");
  assert.equal(mapped.externalFormId, "form-1");
  assert.equal(mapped.firstName, "Ada");
  assert.equal(mapped.lastName, "Traveler");
  assert.equal(mapped.email, "ada@example.com");
  assert.equal(mapped.whatsappNumber, "+2348000000101");
  assert.equal(mapped.state, "Lagos");
  assert.equal(mapped.googleCampaignId, "campaign-1");
  assert.equal(mapped.googleAdGroupId, "adgroup-1");
  assert.equal(mapped.googleAdId, "creative-1");
  assert.equal(mapped.googleClickId, "gclid-1");
});

test("processGoogleAdsPayload upserts a lead and records attribution details", async (t) => {
  let receivedInput: unknown;
  let eventData: Record<string, unknown> | null | undefined;
  let processedId = "";

  t.mock.method(leadStore, "upsertExternalLead", async (input: ExternalLeadUpsertInput) => {
    receivedInput = input;
    return {
      lead: {
        id: "lead-1",
        externalLeadId: "google-lead-1",
      },
      created: true,
      duplicateOfId: null,
    } as Awaited<ReturnType<typeof leadStore.upsertExternalLead>>;
  });
  t.mock.method(leadStore, "addLeadEvent", async (input: LeadEventCreateInput) => {
    eventData = input.eventData;
    return {
      id: "event-1",
      leadId: input.leadId,
      eventType: input.eventType,
      eventData: input.eventData ?? null,
      createdBy: null,
      createdAt: new Date().toISOString(),
    };
  });
  t.mock.method(leadStore, "markPayloadProcessed", async (id: string) => {
    processedId = id;
    return null;
  });

  const result = await processGoogleAdsPayload("payload-1", buildGooglePayload());

  assert.deepEqual(result, { processed: 1, skipped: false });
  assert.equal(processedId, "payload-1");
  assert.equal((receivedInput as { source: string }).source, "google_ads");
  assert.equal(eventData?.campaignName, "June Growth Push");
  assert.equal(eventData?.googleClickId, "gclid-1");
});

test("processGoogleAdsPayload handles duplicate leads without creating a new CRM record", async (t) => {
  let createdFlag: boolean | undefined;

  t.mock.method(leadStore, "upsertExternalLead", async () => ({
    lead: {
      id: "lead-1",
      externalLeadId: "google-lead-1",
    },
    created: false,
    duplicateOfId: "lead-1",
  }) as Awaited<ReturnType<typeof leadStore.upsertExternalLead>>);
  t.mock.method(leadStore, "addLeadEvent", async (input: LeadEventCreateInput) => {
    createdFlag = input.eventData?.created as boolean | undefined;
    return {
      id: "event-1",
      leadId: input.leadId,
      eventType: input.eventType,
      eventData: input.eventData ?? null,
      createdBy: null,
      createdAt: new Date().toISOString(),
    };
  });
  t.mock.method(leadStore, "markPayloadProcessed", async () => null);

  const result = await processGoogleAdsPayload("payload-duplicate", buildGooglePayload());

  assert.equal(result.processed, 1);
  assert.equal(createdFlag, false);
});

test("processGoogleAdsPayload marks the payload as failed when lead upsert throws", async (t) => {
  let failed: { id: string; message: string } | null = null;

  t.mock.method(leadStore, "upsertExternalLead", async () => {
    throw new Error("Lead store unavailable");
  });
  t.mock.method(leadStore, "markPayloadFailed", async (id: string, errorMessage: string) => {
    failed = { id, message: errorMessage };
    return null;
  });

  await assert.rejects(
    processGoogleAdsPayload("payload-fail", buildGooglePayload()),
    /Lead store unavailable/,
  );

  assert.deepEqual(failed, {
    id: "payload-fail",
    message: "Lead store unavailable",
  });
});
