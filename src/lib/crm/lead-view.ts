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
  formatLeadInterestLabel,
  formatLeadSourceLabel,
  formatLeadStateLabel,
} from "@/lib/crm/labels";
import type { LeadFollowUpState } from "@/lib/crm/sales-command";
import type { LeadPriority, LeadRecord, LeadSource } from "@/lib/crm/types";

export interface AdminLeadListItem {
  id: string;
  displayName: string;
  initials: string;
  email: string;
  phone: string;
  source: LeadSource | null;
  sourceLabel: string;
  sourceDisplay: LeadSourceDisplay;
  stage: string | null;
  stageLabel: string;
  stageDisplay: LeadStageDisplay;
  priority: LeadPriority;
  priorityLabel: string;
  completionStatus: "active";
  completionLabel: string;
  categoryLabel: string;
  fitSignalLabel: string;
  interestLabel: string;
  assignedUserName: string;
  assignedTo: string | null;
  assignedToList: string[];
  leadCustomerType: "direct" | "business";
  leadCustomerTypeLabel: string;
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
    country: string | null;
    region: string | null;
    city: string | null;
    address: string | null;
    postalCode: string | null;
    companyName: string | null;
    leadCustomerType: "direct" | "business";
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

function buildAssignedUserName(lead: LeadRecord) {
  const summary = formatLeadAssigneeSummary(lead.assignedToList);
  if (!summary.primary) {
    return "Unassigned";
  }

  return summary.additionalCount > 0
    ? `${summary.primary} +${summary.additionalCount} more`
    : summary.primary;
}

function formatDisplayValue(value: unknown, emptyLabel = "Not provided") {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    return `${value}`;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : emptyLabel;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return emptyLabel;
}

function resolveFollowUpState(lead: Pick<LeadRecord, "wonAt" | "lostAt" | "nextFollowUpAt">): LeadFollowUpState {
  if (lead.wonAt || lead.lostAt) {
    return "no_follow_up";
  }

  if (!lead.nextFollowUpAt) {
    return "no_follow_up";
  }

  const nextFollowUp = new Date(lead.nextFollowUpAt);
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  if (nextFollowUp < startOfToday) {
    return "overdue";
  }

  if (nextFollowUp <= endOfToday) {
    return "due_today";
  }

  return "upcoming";
}

function buildCategoryLabel(customFields: LeadCustomFieldDisplayValue[]) {
  return (
    customFields.find((field) => field.key === "category" || field.label.toLowerCase() === "category")
      ?.displayValue ?? "Not set"
  );
}

function buildInterestLabel(
  lead: Pick<LeadRecord, "sourceDetail" | "campaignLabel" | "companyName">,
  customFields: LeadCustomFieldDisplayValue[],
) {
  return (
    customFields.find((field) =>
      ["interest", "interest_label", "lead_interest"].includes(field.key.toLowerCase()) ||
      field.label.toLowerCase() === "interest"
    )?.displayValue ??
    formatLeadInterestLabel(lead)
  );
}

function mapStageKeyToBadgeStatus(stageKey?: string | null) {
  switch (stageKey) {
    case "won":
      return "converted";
    case "lost":
      return "lost";
    case "qualified":
      return "qualified";
    case "proposal":
      return "qualified";
    case "follow_up":
      return "contacted";
    case "contacted":
      return "contacted";
    case "archived":
      return "closed";
    case "new":
    default:
      return "new";
  }
}

function buildFitSignalLabel(lead: LeadRecord, customFields: LeadCustomFieldDisplayValue[]) {
  const customValue = customFields.find((field) =>
    ["fit_signal", "fitsignal"].includes(field.key.toLowerCase()) ||
    field.label.toLowerCase() === "fit signal"
  )?.displayValue;

  if (customValue) {
    return customValue;
  }

  if (lead.closeProbability !== null && lead.closeProbability !== undefined) {
    return `${lead.closeProbability}% likely`;
  }

  if (lead.wonAt) {
    return "Won";
  }

  if (lead.lostAt) {
    return "Lost";
  }

  return "Not scored";
}

function buildBudgetStatusLabel(customFields: LeadCustomFieldDisplayValue[]) {
  return (
    customFields.find((field) =>
      ["budget_status", "budget"].includes(field.key.toLowerCase()) ||
      field.label.toLowerCase() === "budget status"
    )?.displayValue ?? "Not provided"
  );
}

function buildKeyFacts(lead: LeadRecord, listItem: AdminLeadListItem) {
  const rows: Array<[string, unknown]> = [
    ["Lead type", listItem.leadCustomerTypeLabel],
    ["Company", lead.companyName],
    ["Source", listItem.sourceLabel],
    ["Stage", listItem.stageLabel],
    ["State/Region", lead.region ?? lead.state],
    ["Country", lead.country],
    ["City", lead.city],
    ["Pipeline value", lead.estimatedValue],
    ["Expected close", lead.expectedCloseDate],
  ];

  return rows.map(([label, value]) => ({
    label,
    value: formatDisplayValue(value),
  }));
}

function buildIntakeAnswers(customFields: LeadCustomFieldDisplayValue[]) {
  return customFields
    .filter((field) => field.showInDetails && field.displayValue)
    .map((field) => ({
      label: field.label,
      value: field.displayValue || "Not provided",
    }));
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
  const leadCustomerType = lead.leadCustomerType === "business" ? "business" : "direct";

  return {
    id: lead.id,
    displayName: buildLeadDisplayName(lead),
    initials: buildLeadInitials(lead),
    email: lead.email || "",
    phone: lead.whatsappNumber || "",
    source: lead.source,
    sourceLabel: readModel.source.label || formatLeadSourceLabel(lead.source),
    sourceDisplay: readModel.source,
    stage: mapStageKeyToBadgeStatus(readModel.stage.key),
    stageLabel: readModel.stage.label || "New",
    stageDisplay: readModel.stage,
    priority: lead.priority,
    priorityLabel: crmLabelize(lead.priority),
    completionStatus: "active",
    completionLabel: lead.archivedAt ? "Archived" : "Active lead",
    categoryLabel: buildCategoryLabel(readModel.customFields),
    fitSignalLabel: buildFitSignalLabel(lead, readModel.customFields),
    interestLabel: buildInterestLabel(lead, readModel.customFields),
    assignedUserName,
    assignedTo: lead.assignedTo,
    assignedToList: lead.assignedToList,
    leadCustomerType,
    leadCustomerTypeLabel: leadCustomerType === "business" ? "Company lead" : "Individual lead",
    ownerDisplay: {
      ...readModel.owner,
      label: assignedUserName,
    },
    customFieldDisplayValues: readModel.customFields,
    stateLabel: lead.region || lead.state ? formatLeadStateLabel(lead.region ?? lead.state) : "Location not captured yet",
    stateRaw: lead.region ?? lead.state,
    createdAt: lead.createdAt,
    lastActivityAt: lead.lastActivityAt,
    nextFollowUpAt: options?.nextFollowUpAt ?? lead.nextFollowUpAt ?? null,
    nextFollowUpStatus: resolveFollowUpState({
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
    budgetStatusLabel: buildBudgetStatusLabel(listItem.customFieldDisplayValues),
    completedAtLabel: lead.updatedAt,
    keyFacts: buildKeyFacts(lead, listItem),
    intakeAnswers: buildIntakeAnswers(listItem.customFieldDisplayValues),
    reportSummary: null,
    attributionDetails: ([
      ["Source", listItem.sourceLabel],
      ["Stage", listItem.stageLabel],
      ["State/Region", lead.region ?? lead.state],
      ["Country", lead.country],
      ["City", lead.city],
      ["Form type", attribution.formType],
      ["Campaign", attribution.campaignId],
      ["Ad group", attribution.adGroupId],
      ["Ad ID", attribution.adId],
      ["UTM source", attribution.utmSource],
      ["UTM campaign", attribution.utmCampaign],
      ["Landing page", attribution.landingPage],
    ] as Array<[string, string | null | number | undefined]>).map(([label, value]) => ({
      label,
      value: formatDisplayValue(value, "Not captured yet"),
    })),
    marketingConsent: false,
    profile: {
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      whatsappNumber: lead.whatsappNumber,
      state: lead.state,
      country: lead.country ?? null,
      region: lead.region ?? null,
      city: lead.city ?? null,
      address: lead.address ?? null,
      postalCode: lead.postalCode ?? null,
      companyName: lead.companyName ?? null,
      leadCustomerType: listItem.leadCustomerType,
    },
  };
}
