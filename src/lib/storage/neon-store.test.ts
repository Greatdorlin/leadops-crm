import assert from "node:assert/strict";
import test from "node:test";
import { neon } from "@neondatabase/serverless";
import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { emptyAnswers } from "@/lib/assessment/defaults";
import * as schema from "@/lib/db/schema";
import { buildPublicAssessmentResult } from "@/lib/pathway-engine/report/public-report-payload";
import { generateReport } from "@/lib/pathway-engine/report-generator";
import { reportScenarios } from "@/lib/pathway-engine/report-scenarios";
import { NeonLeadStore } from "./neon-store";

loadEnvConfig(process.cwd());

const testDatabaseUrl = process.env.LEAD_STORE_TEST_DATABASE_URL;

const dbTest = testDatabaseUrl ? test : test.skip;

dbTest("NeonLeadStore persists drafts, completion, analytics, and CRM state", async () => {
  const connection = neon(testDatabaseUrl!);
  const db = drizzle(connection, { schema });
  const store = new NeonLeadStore(() => db);

  const uniqueEmail = `neon-store-${Date.now()}@example.com`;
  const initialAnswers = {
    ...emptyAnswers,
    firstName: "Test",
    primaryGoal: "study_abroad" as const,
    destinationInterest: "canada",
  };

  const created = await store.upsertDraft({
    leadId: null,
    answers: initialAnswers,
    currentStepKey: "destination_interest",
    currentStepIndex: 5,
    progressPercent: 34,
  });

  try {
    assert.equal(created.completionStatus, "incomplete");
    assert.equal(created.currentStepKey, "destination_interest");

    const updated = await store.upsertDraft({
      leadId: created.id,
      answers: {
        ...initialAnswers,
        email: uniqueEmail,
        passportStatus: "valid",
        passportValidity: "24_plus",
        timeline: "6_12_months",
        fundingReadiness: "cover_travel_settlement",
      },
      currentStepKey: "timeline",
      currentStepIndex: 12,
      progressPercent: 72,
    });

    assert.equal(updated.email, uniqueEmail);
    assert.equal(updated.progressPercent, 72);

    const report = generateReport({
      ...reportScenarios.strongStudyToWorkFit,
      email: uniqueEmail,
      firstName: "Test",
      lastName: "Lead",
      whatsappNumber: "+2348000000000",
    });
    const answers = {
      ...reportScenarios.strongStudyToWorkFit,
      email: uniqueEmail,
      firstName: "Test",
      lastName: "Lead",
      whatsappNumber: "+2348000000000",
    };

    const completed = await store.completeLead({
      leadId: created.id,
      answers,
      report,
      publicReport: buildPublicAssessmentResult({ answers, report }),
    });

    assert.equal(completed.completionStatus, "complete");
    assert.ok(completed.reportToken);
    assert.ok(completed.report);
    assert.ok(completed.publicReport);

    const byToken = await store.getByReportToken(completed.reportToken!);
    assert.equal(byToken?.id, completed.id);

    const tracked = await store.trackByReportToken(completed.reportToken!, "report_viewed");
    assert.equal(tracked?.analytics.reportViewed, true);

    const crmUpdated = await store.updateCrmStatus(completed.id, "qualified");
    assert.equal(crmUpdated?.crmStatus, "qualified");
  } finally {
    await db.delete(schema.leads).where(eq(schema.leads.id, created.id));
  }
});

dbTest("NeonLeadStore dedupes external leads by Facebook leadgen ID and by email plus phone", async () => {
  const connection = neon(testDatabaseUrl!);
  const db = drizzle(connection, { schema });
  const store = new NeonLeadStore(() => db);

  const uniqueEmail = `crm-dedupe-${Date.now()}@example.com`;
  let dedicatedWebsiteLeadId = "";
  const first = await store.upsertExternalLead({
    source: "facebook_lead_ads",
    sourceDetail: "lead_form_a",
    firstName: "Ada",
    lastName: "Traveler",
    email: uniqueEmail,
    whatsappNumber: "+2348000001111",
    facebookLeadgenId: `fb-${Date.now()}`,
    sourcePayload: { provider: "facebook" },
  });

  try {
    const second = await store.upsertExternalLead({
      source: "facebook_lead_ads",
      sourceDetail: "lead_form_b",
      firstName: "Ada",
      lastName: "Traveler",
      email: uniqueEmail,
      whatsappNumber: "+2348000001111",
      facebookLeadgenId: first.lead.facebookLeadgenId,
      sourcePayload: { provider: "facebook", duplicate: true },
    });
    const third = await store.upsertExternalLead({
      source: "website_form",
      sourceDetail: "website_form",
      firstName: "Ada",
      lastName: "Traveler",
      email: uniqueEmail,
      whatsappNumber: "+2348000001111",
      sourcePayload: { provider: "website" },
    });
    const fourth = await store.upsertExternalLead({
      source: "website_form",
      sourceDetail: "uk-master",
      alwaysCreateNewRecord: true,
      firstName: "Ada",
      lastName: "Traveler",
      email: uniqueEmail,
      whatsappNumber: "+2348000001111",
      topPathwayTitle: "UK Master's Full Tuition Support (Loan)",
      sourcePayload: { provider: "website", routeId: "uk-master" },
    });

    assert.equal(first.created, true);
    assert.equal(second.created, false);
    assert.equal(third.created, false);
    assert.equal(fourth.created, true);
    assert.equal(second.lead.id, first.lead.id);
    assert.equal(third.lead.id, first.lead.id);
    assert.notEqual(fourth.lead.id, first.lead.id);
    assert.equal(fourth.lead.source, "website_form");
    assert.equal(fourth.lead.sourceDetail, "uk-master");
    dedicatedWebsiteLeadId = fourth.lead.id;

    const events = await store.listLeadEvents(first.lead.id);
    assert.ok(events.some((event) => event.eventType === "lead_updated_from_source"));
  } finally {
    if (dedicatedWebsiteLeadId) {
      await db.delete(schema.leadEvents).where(eq(schema.leadEvents.leadId, dedicatedWebsiteLeadId));
      await db.delete(schema.leads).where(eq(schema.leads.id, dedicatedWebsiteLeadId));
    }
    await db.delete(schema.leadEvents).where(eq(schema.leadEvents.leadId, first.lead.id));
    await db.delete(schema.leads).where(eq(schema.leads.id, first.lead.id));
  }
});

dbTest("NeonLeadStore records notes, tasks, status changes, assignments, payload retry, and ad metric upsert", async () => {
  const connection = neon(testDatabaseUrl!);
  const db = drizzle(connection, { schema });
  const store = new NeonLeadStore(() => db);
  const campaignId = `cmp-${Date.now()}`;
  let payloadId = "";

  const created = await store.createExternalLead({
    source: "manual_entry",
    sourceDetail: "manual_entry",
    firstName: "Bola",
    lastName: "Consult",
    email: `crm-ops-${Date.now()}@example.com`,
    whatsappNumber: "+2348000002222",
  });

  try {
    await store.addLeadNote({
      leadId: created.id,
      note: "Lead asked for a same-day callback.",
      createdBy: "advisor@example.com",
    });
    const task = await store.addLeadTask({
      leadId: created.id,
      title: "Call lead back",
      dueAt: new Date().toISOString(),
      assignedTo: "advisor@example.com",
      createdBy: "advisor@example.com",
    });
    await store.completeLeadTask(task.id, "advisor@example.com");
    await store.updateCrmStatus(created.id, "qualified", "advisor@example.com");
    await store.assignLead(created.id, "advisor@example.com", "manager@example.com");

    const payload = await store.saveSourcePayload({
      source: "facebook_lead_ads",
      externalId: `payload-${Date.now()}`,
      payload: { ok: true },
    });
    payloadId = payload.id;
    await store.markPayloadFailed(payload.id, "Temporary failure");
    const retried = await store.retrySourcePayload(payload.id);
    assert.equal(retried?.retryCount, 1);
    assert.equal(retried?.processingStatus, "pending");

    await store.upsertAdCampaignMetric({
      provider: "google_ads",
      accountId: "acct-1",
      campaignId,
      campaignName: "Canada Search",
      adGroupId: "ag-1",
      adId: "ad-1",
      date: "2026-06-04",
      impressions: 100,
      clicks: 10,
      spend: "50.00",
      leads: 2,
      conversions: 1,
    });
    await store.upsertAdCampaignMetric({
      provider: "google_ads",
      accountId: "acct-1",
      campaignId,
      campaignName: "Canada Search",
      adGroupId: "ag-1",
      adId: "ad-1",
      date: "2026-06-04",
      impressions: 120,
      clicks: 12,
      spend: "60.00",
      leads: 3,
      conversions: 1,
    });

    const notes = await store.listLeadNotes(created.id);
    const tasks = await store.listLeadTasks({ leadId: created.id });
    const events = await store.listLeadEvents(created.id);
    const metrics = await store.listAdCampaignMetrics({ provider: "google_ads", campaignId });

    assert.equal(notes.length, 1);
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0]?.completedAt !== null, true);
    assert.ok(events.some((event) => event.eventType === "note_added"));
    assert.ok(events.some((event) => event.eventType === "task_created"));
    assert.ok(events.some((event) => event.eventType === "task_completed"));
    assert.ok(events.some((event) => event.eventType === "status_changed"));
    assert.ok(events.some((event) => event.eventType === "lead_assigned"));
    assert.equal(metrics.length, 1);
    assert.equal(metrics[0]?.clicks, 12);
  } finally {
    await db.delete(schema.adCampaignMetrics).where(eq(schema.adCampaignMetrics.campaignId, campaignId));
    if (payloadId) {
      await db.delete(schema.leadSourcePayloads).where(eq(schema.leadSourcePayloads.id, payloadId));
    }
    await db.delete(schema.leadTasks).where(eq(schema.leadTasks.leadId, created.id));
    await db.delete(schema.leadNotes).where(eq(schema.leadNotes.leadId, created.id));
    await db.delete(schema.leadEvents).where(eq(schema.leadEvents.leadId, created.id));
    await db.delete(schema.leads).where(eq(schema.leads.id, created.id));
  }
});

dbTest("NeonLeadStore updates lead profiles and keeps answers aligned", async () => {
  const connection = neon(testDatabaseUrl!);
  const db = drizzle(connection, { schema });
  const store = new NeonLeadStore(() => db);

  const created = await store.createExternalLead({
    source: "manual_entry",
    sourceDetail: "manual_entry",
    firstName: "Ada",
    lastName: "Traveler",
    email: `profile-update-${Date.now()}@example.com`,
    whatsappNumber: "+2348000003333",
    state: "lagos",
    primaryGoal: "study_abroad",
  });

  try {
    const updated = await store.updateLeadProfile(
      created.id,
      {
        firstName: "Adanna",
        lastName: "Okafor",
        email: `profile-update-next-${Date.now()}@example.com`,
        whatsappNumber: "+2348000004444",
        state: "abuja_fct",
        primaryGoal: "work_and_relocate",
      },
      "advisor@example.com",
    );

    assert.equal(updated?.firstName, "Adanna");
    assert.equal(updated?.lastName, "Okafor");
    assert.equal(updated?.email.includes("profile-update-next-"), true);
    assert.equal(updated?.whatsappNumber, "+2348000004444");
    assert.equal(updated?.state, "abuja_fct");
    assert.equal(updated?.primaryGoal, "work_and_relocate");
    assert.equal(updated?.answers.firstName, "Adanna");
    assert.equal(updated?.answers.lastName, "Okafor");
    assert.equal(updated?.answers.email.includes("profile-update-next-"), true);
    assert.equal(updated?.answers.whatsappNumber, "+2348000004444");
    assert.equal(updated?.answers.stateOfResidence, "abuja_fct");
    assert.equal(updated?.answers.primaryGoal, "work_and_relocate");

    const events = await store.listLeadEvents(created.id);
    assert.ok(events.some((event) => event.eventType === "lead_profile_updated"));
  } finally {
    await db.delete(schema.leadEvents).where(eq(schema.leadEvents.leadId, created.id));
    await db.delete(schema.leads).where(eq(schema.leads.id, created.id));
  }
});

