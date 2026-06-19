import { normalizeGeneratedReport } from "@/lib/pathway-engine/report-generator";
import { formatLeadAssigneeSummary } from "@/lib/crm/lead-assignees";
import { buildLeadAttributionSummary } from "@/lib/crm/attribution";
import {
  buildLeadSalesCommandReadModel,
  type LeadCustomFieldDisplayValue,
  type LeadOwnerDisplay,
  type LeadSourceDisplay,
  type LeadStageDisplay,
} from "@/lib/crm/read-adapters";
import {
  crmLabelize,
  formatLeadCategoryLabel,
  formatLeadInterestLabel,
  formatLeadQualificationLabel,
  formatLeadSourceLabel,
  formatLeadStateLabel,
} from "@/lib/crm/labels";
import { getLeadFollowUpStatus, type LeadFollowUpState } from "@/lib/crm/sales-command";
import type {
  AssessmentAnswers,
  CrmStatus,
  LeadPriority,
  LeadRecord,
  LeadSource,
} from "@/lib/crm/types";

export interface AdminLeadListItem {
  id: string;
  displayName: string;
  initials: string;
  email: string;
  phone: string;
  source: LeadSource | null;
  sourceLabel: string;
  sourceDisplay: LeadSourceDisplay;
  stage: CrmStatus;
  stageLabel: string;
  stageDisplay: LeadStageDisplay;
  priority: LeadPriority;
  priorityLabel: string;
  completionStatus: LeadRecord["completionStatus"];
  completionLabel: string;
  categoryLabel: string;
  fitSignalLabel: string;
  interestLabel: string;
  assignedUserName: string;
  assignedTo: string | null;
  assignedToList: string[];
  ownerDisplay: LeadOwnerDisplay;
  customFieldDisplayValues: LeadCustomFieldDisplayValue[];
  stateLabel: string;
  stateRaw: string | null;
  createdAt: string;
  lastActivityAt: string;
  nextFollowUpAt?: string | null;
  nextFollowUpStatus: LeadFollowUpState;
  companyName: string | null;
  estimatedValue: number | null;
  expectedValue: number | null;
  wonValue: number | null;
  closeProbability: number | null;
  expectedCloseDate: string | null;
  lostReason: string | null;
  routeId: string | null;
  routeLabel: string | null;
  nigeriaState: string | null;
}

export interface AdminLeadTaskView {
  id: string;
  title: string;
  dueAt: string | null;
  assignedUserName: string;
  completedAt: string | null;
  priority: LeadPriority;
}

export interface AdminLeadReportSummaryView {
  summaryDiagnosis: string;
  fitSignalLabel: string;
  fitSignalSummary: string;
  firstAction: string;
  recommendedOfferTitle: string;
  recommendedOfferDescription: string;
  recommendedOfferReason: string;
}

export interface AdminLeadKeyValue {
  label: string;
  value: string;
}

export interface AdminLeadDetailView extends AdminLeadListItem {
  leadName: string;
  routeLine: string;
  summaryLabel: string;
  budgetStatusLabel: string;
  completedAtLabel: string;
  keyFacts: AdminLeadKeyValue[];
  intakeAnswers: AdminLeadKeyValue[];
  reportSummary: AdminLeadReportSummaryView | null;
  attributionDetails: AdminLeadKeyValue[];
  marketingConsent: boolean;
  profile: {
    firstName: string;
    lastName: string;
    email: string;
    whatsappNumber: string;
    state: string | null;
    primaryGoal: LeadRecord["primaryGoal"];
  };
}

export interface AdminLeadReadOptions {
  nextFollowUpAt?: string | null;
  stage?: {
    id: string;
    key: string;
    name: string;
    color?: string | null;
  } | null;
  source?: {
    id: string;
    key: string;
    name: string;
    type?: string | null;
    color?: string | null;
  } | null;
  owner?: {
    id: string;
    fullName?: string | null;
    email?: string | null;
  } | null;
  customFieldDefinitions?: Array<{
    id: string;
    key: string;
    label: string;
    type: LeadCustomFieldDisplayValue["type"];
    description: string | null;
    placeholder: string | null;
    required: boolean;
    archived: boolean;
    showInTable: boolean;
    showInForm: boolean;
    showInDetails: boolean;
    searchable: boolean;
    filterable: boolean;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
  }>;
  customFieldValues?: Array<{
    customFieldId: string;
    value: unknown;
    displayValue?: string | null;
  }>;
}

function buildLeadDisplayName(lead: Pick<LeadRecord, "firstName" | "lastName">) {
  const fullName = `${lead.firstName || "Lead"} ${lead.lastName}`.trim();
  return fullName || "Lead";
}

function buildLeadInitials(lead: Pick<LeadRecord, "firstName" | "lastName">) {
  return (
    [lead.firstName, lead.lastName]
      .filter(Boolean)
      .map((value) => value?.trim().charAt(0).toUpperCase())
      .join("")
      .slice(0, 2) || "LD"
  );
}

function formatAnswerValue(value: boolean | string | null, key?: string) {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (!value) {
    return "Not provided";
  }

  if (key === "stateOfResidence") {
    return formatLeadStateLabel(value);
  }

  return crmLabelize(value);
}

function buildBudgetStatusLabel(answers: AssessmentAnswers) {
  return formatAnswerValue(answers.fundingReadiness || answers.studyFundingReadiness || null);
}

function buildFitSignalLabel(lead: LeadRecord) {
  if (lead.readinessLevel) {
    return formatLeadQualificationLabel(lead.readinessLevel);
  }

  return formatAnswerValue(lead.answers.assessmentReadiness ?? null);
}

function buildAssignedUserName(lead: LeadRecord) {
  const summary = formatLeadAssigneeSummary(lead.assignedToList);
  if (!summary.primary) {
    return "Unassigned";
  }

  return summary.additionalCount > 0
    ? `${summary.primary} +${summary.additionalCount} more`
    : summary.primary;
}

function buildKeyFacts(lead: LeadRecord) {
  const rows: Array<[string, boolean | string | null]> = [
    ["State", lead.state ? formatLeadStateLabel(lead.state) : null],
    ["Destination", lead.answers.destinationInterest],
    ["Category", lead.primaryGoal ? formatLeadCategoryLabel(lead.primaryGoal) : null],
    [
      "Highest qualification",
      lead.answers.highestQualification || lead.answers.highestEducation || null,
    ],
    ["Grade", lead.answers.degreeClass ?? null],
    ["Interest area", lead.answers.desiredCourse || lead.answers.targetField || null],
    ["Budget status", lead.answers.fundingReadiness || lead.answers.studyFundingReadiness],
    ["Preferred timeline", lead.answers.targetIntake || lead.answers.timeline || null],
    ["Fit signal", lead.answers.assessmentReadiness ?? null],
    ["Needs human support", lead.answers.wantsHumanSupport],
    ["Document status", lead.answers.passportStatus],
  ];

  return rows.map(([label, value]) => ({
    label,
    value: formatAnswerValue(value ?? null),
  }));
}

function buildIntakeAnswers(answers: AssessmentAnswers) {
  return Object.entries(answers)
    .filter(([, value]) => {
      return typeof value === "boolean" || (typeof value === "string" && value.length > 0) || value !== null;
    })
    .map(([key, value]) => ({
      label: crmLabelize(key),
      value: formatAnswerValue(value, key),
    }));
}

function buildReportSummary(lead: LeadRecord): AdminLeadReportSummaryView | null {
  if (!lead.report) {
    return null;
  }

  const report = normalizeGeneratedReport(lead.report, lead.answers);

  return {
    summaryDiagnosis: report.summaryDiagnosis,
    fitSignalLabel: formatLeadQualificationLabel(report.readinessLevel),
    fitSignalSummary: report.readinessSummary,
    firstAction: report.firstPracticalStep,
    recommendedOfferTitle: report.recommendedOffer.title,
    recommendedOfferDescription: report.recommendedOffer.description,
    recommendedOfferReason: report.recommendedOfferReason,
  };
}

export function buildAdminLeadListItem(
  lead: LeadRecord,
  options?: AdminLeadReadOptions,
): AdminLeadListItem {
  const attribution = buildLeadAttributionSummary(lead);
  const readModel = buildLeadSalesCommandReadModel({
    lead,
    stage: options?.stage,
    source: options?.source,
    owner: options?.owner,
    customFieldDefinitions: options?.customFieldDefinitions,
    customFieldValues: options?.customFieldValues,
  });
  const assignedUserName = readModel.owner.isNormalized
    ? readModel.owner.label
    : buildAssignedUserName(lead);

  return {
    id: lead.id,
    displayName: buildLeadDisplayName(lead),
    initials: buildLeadInitials(lead),
    email: lead.email || "",
    phone: lead.whatsappNumber || "",
    source: lead.source,
    sourceLabel: readModel.source.label || formatLeadSourceLabel(lead.source),
    sourceDisplay: readModel.source,
    stage: lead.crmStatus,
    stageLabel: readModel.stage.label || crmLabelize(lead.crmStatus),
    stageDisplay: readModel.stage,
    priority: lead.priority,
    priorityLabel: crmLabelize(lead.priority),
    completionStatus: lead.completionStatus,
    completionLabel: lead.completionStatus === "complete" ? "Profile complete" : "Profile in progress",
    categoryLabel: lead.primaryGoal ? formatLeadCategoryLabel(lead.primaryGoal) : "Not set",
    fitSignalLabel: buildFitSignalLabel(lead),
    interestLabel: formatLeadInterestLabel(lead),
    assignedUserName,
    assignedTo: lead.assignedTo,
    assignedToList: lead.assignedToList,
    ownerDisplay: {
      ...readModel.owner,
      label: assignedUserName,
    },
    customFieldDisplayValues: readModel.customFields,
    stateLabel: lead.state ? formatLeadStateLabel(lead.state) : "State not captured yet",
    stateRaw: lead.state,
    createdAt: lead.createdAt,
    lastActivityAt: lead.lastActivityAt,
    nextFollowUpAt: options?.nextFollowUpAt ?? lead.nextFollowUpAt ?? null,
    nextFollowUpStatus: getLeadFollowUpStatus({
      crmStatus: lead.crmStatus,
      wonAt: lead.wonAt ?? null,
      lostAt: lead.lostAt ?? null,
      nextFollowUpAt: options?.nextFollowUpAt ?? lead.nextFollowUpAt ?? null,
    }),
    companyName: lead.companyName ?? null,
    estimatedValue: lead.estimatedValue ?? null,
    expectedValue: lead.expectedValue ?? null,
    wonValue: lead.wonValue ?? null,
    closeProbability: lead.closeProbability ?? null,
    expectedCloseDate: lead.expectedCloseDate ?? null,
    lostReason: lead.lostReason ?? null,
    routeId: attribution.routeId,
    routeLabel: attribution.routeLabel,
    nigeriaState: attribution.nigeriaState,
  };
}

export function buildAdminLeadTaskView(task: {
  id: string;
  title: string;
  dueAt: string | null;
  assignedTo?: string | null;
  completedAt: string | null;
  priority: LeadPriority;
}): AdminLeadTaskView {
  return {
    id: task.id,
    title: task.title,
    dueAt: task.dueAt,
    assignedUserName: task.assignedTo || "Unassigned",
    completedAt: task.completedAt,
    priority: task.priority,
  };
}

export function buildAdminLeadDetailView(
  lead: LeadRecord,
  options?: AdminLeadReadOptions,
): AdminLeadDetailView {
  const attribution = buildLeadAttributionSummary(lead);
  const listItem = buildAdminLeadListItem(lead, options);
  const routeLine = [attribution.routeLabel ?? attribution.routeId, attribution.nigeriaState]
    .filter(Boolean)
    .join(" • ");

  return {
    ...listItem,
    leadName: buildLeadDisplayName(lead),
    routeLine,
    summaryLabel: listItem.interestLabel,
    budgetStatusLabel: buildBudgetStatusLabel(lead.answers),
    completedAtLabel: lead.completedAt ? lead.completedAt : "",
    keyFacts: buildKeyFacts(lead),
    intakeAnswers: buildIntakeAnswers(lead.answers),
    reportSummary: buildReportSummary(lead),
    attributionDetails: ([
      ["Route", attribution.routeLabel || attribution.routeId],
      ["State", attribution.nigeriaState],
      ["Form type", attribution.formType],
      ["Campaign", attribution.campaignId],
      ["Ad group", attribution.adGroupId],
      ["Ad ID", attribution.adId],
      ["UTM source", attribution.utmSource],
      ["UTM campaign", attribution.utmCampaign],
      ["Landing page", attribution.landingPage],
    ] as Array<[string, string | null]>).map(([label, value]) => ({
      label,
      value: value || "Not captured yet",
    })),
    marketingConsent: Boolean(lead.answers.marketingConsent),
    profile: {
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      whatsappNumber: lead.whatsappNumber,
      state: lead.state,
      primaryGoal: lead.primaryGoal,
    },
  };
}
