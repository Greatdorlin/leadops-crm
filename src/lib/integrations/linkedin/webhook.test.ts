import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { GET, POST } from "@/app/api/integrations/linkedin/webhook/route";
import { leadStore } from "@/lib/storage";
import type { LeadEventCreateInput } from "@/lib/storage/types";
import { mapLinkedInLeadToExternalInput } from "./map-lead";
import { processLinkedInPayload } from "./process-payload";
import {
  buildLinkedInChallengeResponse,
  verifyLinkedInSignature,
} from "./verify";

function buildLinkedInResponse() {
  return {
    id: "linkedin-response-1",
    submittedAt: 1717912800000,
    form: {
      id: "linkedin-form-1",
      name: "LinkedIn Form",
      content: {
        questions: [
          {
            questionId: 1,
            name: "email",
            label: "Email",
          },
          {
            questionId: 2,
            name: "full_name",
            label: "Full Name",
          },
        ],
      },
    },
    formResponse: {
      answers: [
        {
          questionId: 1,
          accepted: {
            answer: "chioma@example.com",
          },
        },
        {
          questionId: 2,
          answerDetails: {
            textQuestionAnswer: {
              answer: "Chioma Ude",
            },
          },
        },
      ],
    },
    leadMetadataInfo: {
      sponsoredLeadMetadataInfo: {
        campaign: {
          id: "urn:li:sponsoredCampaign:12345",
          name: "LinkedIn June Push",
        },
      },
    },
    associatedEntityInfo: {
      associatedCreative: {
        id: "urn:li:sponsoredCreative:9988",
      },
    },
    ownerInfo: {
      sponsoredAccount: "urn:li:sponsoredAccount:7777",
    },
  };
}

test("linkedin webhook challenge response uses the client secret HMAC", async () => {
  const previousSecret = process.env.LINKEDIN_CLIENT_SECRET;
  process.env.LINKEDIN_CLIENT_SECRET = "linkedin-secret";

  try {
    const response = buildLinkedInChallengeResponse("challenge-code");
    assert.equal(response.challengeCode, "challenge-code");
    assert.equal(
      response.challengeResponse,
      createHmac("sha256", "linkedin-secret").update("challenge-code").digest("hex"),
    );

    const routeResponse = await GET(
      new Request(
        "https://example.com/api/integrations/linkedin/webhook?challengeCode=challenge-code",
      ),
    );
    assert.equal(routeResponse.status, 200);
  } finally {
    process.env.LINKEDIN_CLIENT_SECRET = previousSecret;
  }
});

test("verifyLinkedInSignature accepts valid signatures and rejects invalid ones", () => {
  const previousSecret = process.env.LINKEDIN_CLIENT_SECRET;
  process.env.LINKEDIN_CLIENT_SECRET = "linkedin-secret";

  try {
    const rawBody = JSON.stringify({ elements: [] });
    const digest = createHmac("sha256", "linkedin-secret").update(rawBody).digest("hex");

    assert.equal(verifyLinkedInSignature(rawBody, `hmacsha256=${digest}`), true);
    assert.equal(verifyLinkedInSignature(rawBody, digest), true);
    assert.equal(verifyLinkedInSignature(rawBody, "invalid"), false);
  } finally {
    process.env.LINKEDIN_CLIENT_SECRET = previousSecret;
  }
});

test("linkedin webhook returns a safe error for malformed JSON after signature verification", async () => {
  const previousSecret = process.env.LINKEDIN_CLIENT_SECRET;
  process.env.LINKEDIN_CLIENT_SECRET = "linkedin-secret";

  try {
    const rawBody = "{invalid-json";
    const signature = createHmac("sha256", "linkedin-secret").update(rawBody).digest("hex");

    const response = await POST(
      new Request("https://example.com/api/integrations/linkedin/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-li-signature": signature,
        },
        body: rawBody,
      }),
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Invalid JSON payload." });
  } finally {
    process.env.LINKEDIN_CLIENT_SECRET = previousSecret;
  }
});

test("mapLinkedInLeadToExternalInput maps fetched LinkedIn lead responses", () => {
  const mapped = mapLinkedInLeadToExternalInput(buildLinkedInResponse());

  assert.equal(mapped.source, "linkedin_lead_gen_forms");
  assert.equal(mapped.sourceDetail, "LinkedIn Form");
  assert.equal(mapped.externalLeadId, "linkedin-response-1");
  assert.equal(mapped.externalFormId, "linkedin-form-1");
  assert.equal(mapped.firstName, "Chioma");
  assert.equal(mapped.lastName, "Ude");
  assert.equal(mapped.email, "chioma@example.com");
});

test("processLinkedInPayload fetches form responses and handles duplicate leads safely", async (t) => {
  const previousToken = process.env.LINKEDIN_ACCESS_TOKEN;
  const previousSecret = process.env.LINKEDIN_CLIENT_SECRET;
  process.env.LINKEDIN_ACCESS_TOKEN = "linkedin-access-token";
  process.env.LINKEDIN_CLIENT_SECRET = "linkedin-secret";

  let receivedEvent: Record<string, unknown> | null | undefined;

  t.mock.method(globalThis, "fetch", async () =>
    new Response(JSON.stringify(buildLinkedInResponse()), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
  t.mock.method(leadStore, "upsertExternalLead", async () => ({
    lead: {
      id: "lead-linkedin-1",
      externalLeadId: "linkedin-response-1",
    },
    created: false,
    duplicateOfId: "lead-linkedin-1",
  }) as Awaited<ReturnType<typeof leadStore.upsertExternalLead>>);
  t.mock.method(leadStore, "addLeadEvent", async (input: LeadEventCreateInput) => {
    receivedEvent = input.eventData;
    return {
      id: "event-linkedin-1",
      leadId: input.leadId,
      eventType: input.eventType,
      eventData: input.eventData ?? null,
      createdBy: null,
      createdAt: new Date().toISOString(),
    };
  });
  t.mock.method(leadStore, "markPayloadProcessed", async () => null);

  try {
    const result = await processLinkedInPayload("payload-linkedin-1", {
      elements: [
        {
          type: "LEAD_ACTION",
          leadAction: "CREATED",
          leadGenFormResponse: "urn:li:leadFormResponse:linkedin-response-1",
          id: "notification-1",
        },
      ],
    });

    assert.equal(result.processed, 1);
    assert.equal(receivedEvent?.campaignId, "12345");
    assert.equal(receivedEvent?.creativeId, "9988");
    assert.equal(receivedEvent?.accountId, "7777");
  } finally {
    process.env.LINKEDIN_ACCESS_TOKEN = previousToken;
    process.env.LINKEDIN_CLIENT_SECRET = previousSecret;
  }
});
