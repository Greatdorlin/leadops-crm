import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "@/app/api/crm/website-lead/route";
import { leadStore } from "@/lib/storage";

test("website lead intake persists the full UK landing page answer set", async (t) => {
  const previousSecret = process.env.CRM_INTAKE_SECRET;
  process.env.CRM_INTAKE_SECRET = "test-secret";

  let receivedInput: Awaited<Parameters<typeof leadStore.upsertExternalLead>[0]> | null = null;

  t.mock.method(leadStore, "saveSourcePayload", async () => ({
    id: "payload-1",
    source: "website_form",
    externalId: "uk-master",
    payload: {},
    processingStatus: "pending",
    processedAt: null,
    errorMessage: null,
    retryCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  t.mock.method(leadStore, "markPayloadProcessing", async () => {});
  t.mock.method(leadStore, "markPayloadProcessed", async () => {});
  t.mock.method(leadStore, "markPayloadFailed", async () => {});
  t.mock.method(leadStore, "addLeadEvent", async () => ({
    id: "event-1",
    leadId: "lead-1",
    eventType: "website_lead_received",
    eventData: null,
    createdBy: null,
    createdAt: new Date().toISOString(),
  }));
  t.mock.method(leadStore, "upsertExternalLead", async (input) => {
    receivedInput = input;
    return {
      lead: {
        id: "lead-1",
      },
      created: true,
      duplicateOfId: null,
    } as Awaited<ReturnType<typeof leadStore.upsertExternalLead>>;
  });

  try {
    const response = await POST(
      new Request("https://example.com/api/crm/website-lead", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-crm-intake-secret": "test-secret",
        },
        body: JSON.stringify({
          firstName: "Ada",
          lastName: "Okafor",
          email: "ada@example.com",
          phone: "+2348012345678",
          routeId: "uk-master",
          routeLabel: "UK Master's Full Tuition Support (Loan)",
          landingPage: "/uk-masters",
          answers: {
            nigeriaState: "Lagos",
            highestQualification: "Bachelor’s degree",
            degreeClass: "Second Class Upper",
            graduationYear: "2022",
            studiedCourse: "Economics",
            desiredCourse: "MSc Business Analytics",
            passportStatus: "Yes",
            targetIntake: "September 2026",
            assessmentReadiness: "Yes, I am ready",
            contactTimeline: "Within 24 hours",
            consent: "Yes, I understand",
          },
        }),
      }),
    );

    assert.equal(response.status, 200);
    assert.ok(receivedInput);
    assert.equal(receivedInput?.state, "Lagos");
    assert.equal(receivedInput?.primaryGoal, "study_abroad");
    assert.equal(receivedInput?.alwaysCreateNewRecord, undefined);
    assert.equal(receivedInput?.answers?.firstName, "Ada");
    assert.equal(receivedInput?.answers?.lastName, "Okafor");
    assert.equal(receivedInput?.answers?.email, "ada@example.com");
    assert.equal(receivedInput?.answers?.whatsappNumber, "+2348012345678");
    assert.equal(receivedInput?.answers?.stateOfResidence, "Lagos");
    assert.equal(receivedInput?.answers?.nigeriaState, "Lagos");
    assert.equal(receivedInput?.answers?.highestQualification, "Bachelor’s degree");
    assert.equal(receivedInput?.answers?.highestEducation, "Bachelor’s degree");
    assert.equal(receivedInput?.answers?.degreeClass, "Second Class Upper");
    assert.equal(receivedInput?.answers?.graduationYear, "2022");
    assert.equal(receivedInput?.answers?.studiedCourse, "Economics");
    assert.equal(receivedInput?.answers?.desiredCourse, "MSc Business Analytics");
    assert.equal(receivedInput?.answers?.targetField, "MSc Business Analytics");
    assert.equal(receivedInput?.answers?.passportStatus, "Yes");
    assert.equal(receivedInput?.answers?.timeline, "September 2026");
    assert.equal(receivedInput?.answers?.targetIntake, "September 2026");
    assert.equal(receivedInput?.answers?.studyFundingReadiness, "Yes, I am ready");
    assert.equal(receivedInput?.answers?.fundingReadiness, "Yes, I am ready");
    assert.equal(receivedInput?.answers?.assessmentReadiness, "Yes, I am ready");
    assert.equal(receivedInput?.answers?.contactTimeline, "Within 24 hours");
    assert.equal(receivedInput?.answers?.consent, "Yes, I understand");
  } finally {
    process.env.CRM_INTAKE_SECRET = previousSecret;
  }
});
