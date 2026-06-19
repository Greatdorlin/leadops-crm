import assert from "node:assert/strict";
import test from "node:test";
import type { LeadRecord } from "@/lib/crm/types";
import {
  buildAdminLeadDetailView,
  buildAdminLeadListItem,
} from "@/lib/crm/view-models";

function buildLeadRecord(overrides: Partial<LeadRecord> = {}): LeadRecord {
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
    sourceId: null,
    sourceDetail: "website",
    stageId: null,
    priority: "medium",
    assignedTo: "rep@example.com",
    assignedToList: ["rep@example.com"],
    assignedUserId: null,
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
    sourcePayload: null,
    primaryGoal: "study_abroad",
    currentStepKey: "contact",
    currentStepIndex: 4,
    progressPercent: 55,
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
    report: null,
    publicReport: null,
    sync: {
      googleSheets: { status: "pending", message: "", lastAttemptAt: null, syncedAt: null },
      sender: { status: "pending", message: "", lastAttemptAt: null, syncedAt: null },
    },
    analytics: {
      whatsappClicked: false,
      consultationClicked: false,
      reportViewed: false,
    },
    ...overrides,
  };
}

test("admin lead list item prefers normalized stage and source display labels", () => {
  const lead = buildLeadRecord({
    stageId: "stage-1",
    sourceId: "source-1",
    assignedUserId: "user-1",
  });

  const view = buildAdminLeadListItem(lead, {
    stage: { id: "stage-1", key: "proposal", name: "Proposal", color: "#1d4ed8" },
    source: { id: "source-1", key: "website", name: "Website", type: "website", color: "#0ea5e9" },
    owner: { id: "user-1", fullName: "Owner Admin", email: "owner@example.com" },
  });

  assert.equal(view.stageLabel, "Proposal");
  assert.equal(view.stageDisplay.isNormalized, true);
  assert.equal(view.sourceLabel, "Website");
  assert.equal(view.sourceDisplay.isNormalized, true);
  assert.equal(view.assignedUserName, "Owner Admin");
  assert.equal(view.ownerDisplay.isNormalized, true);
});

test("admin lead list item falls back safely to legacy stage, source, and owner labels", () => {
  const view = buildAdminLeadListItem(buildLeadRecord());

  assert.equal(view.stageLabel, "Contacted");
  assert.equal(view.stageDisplay.isNormalized, false);
  assert.equal(view.sourceLabel, "Website form");
  assert.equal(view.sourceDisplay.isNormalized, false);
  assert.equal(view.assignedUserName, "rep@example.com");
  assert.equal(view.ownerDisplay.label, "rep@example.com");
});

test("admin lead detail view includes custom field display values without requiring them", () => {
  const lead = buildLeadRecord();

  const withoutFields = buildAdminLeadDetailView(lead);
  assert.deepEqual(withoutFields.customFieldDisplayValues, []);

  const withFields = buildAdminLeadDetailView(lead, {
    customFieldDefinitions: [
      {
        id: "field-1",
        key: "budget",
        label: "Budget",
        type: "currency",
        description: null,
        placeholder: null,
        required: false,
        archived: false,
        showInTable: true,
        showInForm: true,
        showInDetails: true,
        searchable: true,
        filterable: true,
        sortOrder: 0,
        createdAt: "2026-06-18T00:00:00.000Z",
        updatedAt: "2026-06-18T00:00:00.000Z",
      },
    ],
    customFieldValues: [{ customFieldId: "field-1", value: 250000, displayValue: "250,000" }],
  });

  assert.equal(withFields.customFieldDisplayValues.length, 1);
  assert.equal(withFields.customFieldDisplayValues[0].label, "Budget");
  assert.equal(withFields.customFieldDisplayValues[0].displayValue, "250,000");
});

test("showInTable custom fields flow into the lead list read model", () => {
  const lead = buildLeadRecord();

  const view = buildAdminLeadListItem(lead, {
    customFieldDefinitions: [
      {
        id: "field-1",
        key: "budget",
        label: "Budget",
        type: "currency",
        description: null,
        placeholder: null,
        required: false,
        archived: false,
        showInTable: true,
        showInForm: true,
        showInDetails: true,
        searchable: true,
        filterable: true,
        sortOrder: 0,
        createdAt: "2026-06-18T00:00:00.000Z",
        updatedAt: "2026-06-18T00:00:00.000Z",
      },
    ],
    customFieldValues: [{ customFieldId: "field-1", value: 500000, displayValue: "500,000" }],
  });

  assert.equal(view.customFieldDisplayValues.length, 1);
  assert.equal(view.customFieldDisplayValues[0].showInTable, true);
  assert.equal(view.customFieldDisplayValues[0].displayValue, "500,000");
});
