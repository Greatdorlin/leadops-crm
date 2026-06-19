import assert from "node:assert/strict";
import test from "node:test";
import type { LeadRecord } from "@/lib/crm/types";
import {
  mapLegacyLeadEventToDomainActivity,
  mapLegacyLeadNoteToDomainNote,
  mapLegacyLeadRecordToLeadCoreRecord,
  mapLegacyLeadRecordToLeadDetailRecord,
  mapLegacyLeadTaskToDomainTask,
} from "@/lib/crm/domain";

function buildLegacyLeadRecord(): LeadRecord {
  return {
    id: "lead-1",
    reportToken: "token-1",
    createdAt: "2026-06-18T08:00:00.000Z",
    updatedAt: "2026-06-18T09:00:00.000Z",
    lastActivityAt: "2026-06-18T09:00:00.000Z",
    completedAt: null,
    deletedAt: null,
    deletedBy: null,
    completionStatus: "incomplete",
    crmStatus: "contacted",
    source: "website_form",
    sourceDetail: "homepage-form",
    priority: "medium",
    assignedTo: "rep@example.com",
    assignedToList: ["rep@example.com"],
    firstName: "Ada",
    lastName: "Okafor",
    email: "ada@example.com",
    whatsappNumber: "+2348012345678",
    state: "lagos",
    externalLeadId: null,
    externalFormId: null,
    facebookLeadgenId: null,
    facebookFormId: null,
    facebookPageId: null,
    facebookCampaignId: null,
    facebookAdId: null,
    facebookAdsetId: null,
    googleClickId: null,
    googleCampaignId: null,
    googleAdGroupId: null,
    googleAdId: null,
    utmSource: "website",
    utmMedium: "form",
    utmCampaign: "June Push",
    utmContent: null,
    utmTerm: null,
    landingPage: "/",
    sourcePayload: { estimatedValue: 250000 },
    primaryGoal: "study_abroad",
    currentStepKey: "contact",
    currentStepIndex: 6,
    progressPercent: 68,
    readinessLevel: "Emerging",
    topPathwayTitle: "Executive Coaching",
    answers: {
      firstName: "Ada",
      lastName: "Okafor",
      whatsappNumber: "+2348012345678",
      email: "ada@example.com",
      primaryGoal: "study_abroad",
      countryClarity: null,
      destinationInterest: "canada",
      studyLevel: null,
      ageRange: null,
      highestEducation: "Bachelor's degree",
      studyFundingReadiness: "ready",
      workField: null,
      workExperienceYears: null,
      languageTestStatus: null,
      businessMoveType: null,
      businessStage: null,
      visitTravelType: null,
      visitTravelWindow: null,
      eventType: null,
      eventPurpose: null,
      familyComposition: null,
      familyOpenPathway: null,
      unsurePriority: null,
      openCountries: null,
      stateOfResidence: "lagos",
      nigeriaState: "lagos",
      passportStatus: "yes",
      passportValidity: null,
      timeline: "3_months",
      fundingReadiness: "ready",
      previousRefusal: null,
      highestQualification: "Bachelor's degree",
      degreeClass: null,
      graduationYear: null,
      studiedCourse: null,
      desiredCourse: "MBA",
      targetField: "MBA",
      targetIntake: "fall",
      assessmentReadiness: "warm",
      contactTimeline: null,
      consent: null,
      sendReportConsent: false,
      wantsHumanSupport: true,
      marketingConsent: false,
    },
    report: {
      summaryDiagnosis: "Strong follow-up potential",
      firstPracticalStep: "Call within 24 hours",
    } as never,
    publicReport: { report: null } as never,
    sync: {
      googleSheets: { status: "pending", message: "", lastAttemptAt: null, syncedAt: null },
      sender: { status: "pending", message: "", lastAttemptAt: null, syncedAt: null },
    },
    analytics: {
      whatsappClicked: false,
      consultationClicked: false,
      reportViewed: false,
    },
  };
}

test("legacy lead mapping returns neutral core fields without exposing raw legacy names", () => {
  const mapped = mapLegacyLeadRecordToLeadCoreRecord(buildLegacyLeadRecord());

  assert.equal(mapped.name, "Ada Okafor");
  assert.equal(mapped.priority, "normal");
  assert.equal(mapped.sourceLabel, "Website form");
  assert.equal(mapped.categoryLabel, "Education");
  assert.equal(mapped.interestLabel, "Executive Coaching");
  assert.equal("primaryGoal" in mapped, false);
  assert.equal("readinessLevel" in mapped, false);
  assert.equal("topPathwayTitle" in mapped, false);
  assert.equal("reportToken" in mapped, false);
});

test("legacy lead detail mapping keeps legacy fields inside neutral intake summaries", () => {
  const detail = mapLegacyLeadRecordToLeadDetailRecord(buildLegacyLeadRecord());

  assert.equal(detail.intakeSummary?.legacyProgress?.stepKey, "contact");
  assert.equal(detail.intakeSummary?.reportSummary?.reportToken, "token-1");
  assert.equal(detail.intakeSummary?.reportSummary?.recommendedAction, "Call within 24 hours");
  assert.equal("currentStepKey" in detail, false);
  assert.equal("answers" in detail, false);
  assert.equal("report" in detail, false);
});

test("legacy task, note, and event mapping produce neutral activity contracts", () => {
  const task = mapLegacyLeadTaskToDomainTask({
    id: "task-1",
    leadId: "lead-1",
    title: "Call lead",
    description: null,
    dueAt: null,
    completedAt: null,
    assignedTo: "rep@example.com",
    createdAt: "2026-06-18T09:00:00.000Z",
  });
  const note = mapLegacyLeadNoteToDomainNote({
    id: "note-1",
    leadId: "lead-1",
    note: "Needs callback",
    createdBy: "rep@example.com",
    createdAt: "2026-06-18T09:00:00.000Z",
  });
  const activity = mapLegacyLeadEventToDomainActivity({
    id: "event-1",
    leadId: "lead-1",
    eventType: "google_sheet_exported",
    eventData: { format: "csv" },
    createdBy: "admin@example.com",
    createdAt: "2026-06-18T09:00:00.000Z",
  });

  assert.equal(task.status, "open");
  assert.equal(note.body, "Needs callback");
  assert.equal(activity.type, "export_completed");
  assert.equal(activity.message, "Exported to Google Sheets");
});
