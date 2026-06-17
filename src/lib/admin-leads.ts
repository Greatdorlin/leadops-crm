import {
  COMPLETION_STATUSES,
  CRM_STATUSES,
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  PRIMARY_GOALS,
  type CompletionStatus,
  type CrmStatus,
  type LeadPriority,
  type LeadRecord,
  type LeadSource,
  type PrimaryGoal,
} from "@/lib/pathway-engine/types";
import type { LeadListFilters } from "@/lib/storage/types";

type QueryLike = URLSearchParams | Record<string, string | string[] | undefined>;

function readValue(input: QueryLike, key: string) {
  if (input instanceof URLSearchParams) {
    return input.get(key) ?? undefined;
  }

  const value = input[key];
  return Array.isArray(value) ? value[0] : value;
}

function isCompletionStatus(value?: string): value is CompletionStatus {
  return Boolean(value) && COMPLETION_STATUSES.includes(value as CompletionStatus);
}

function isCrmStatus(value?: string): value is CrmStatus {
  return Boolean(value) && CRM_STATUSES.includes(value as CrmStatus);
}

function isLeadSource(value?: string): value is LeadSource {
  return Boolean(value) && LEAD_SOURCES.includes(value as LeadSource);
}

function isLeadPriority(value?: string): value is LeadPriority {
  return Boolean(value) && LEAD_PRIORITIES.includes(value as LeadPriority);
}

function isPrimaryGoal(value?: string): value is PrimaryGoal {
  return Boolean(value) && PRIMARY_GOALS.includes(value as PrimaryGoal);
}

export function parseLeadListFilters(input: QueryLike): LeadListFilters {
  const completionStatus = readValue(input, "completionStatus");
  const crmStatus = readValue(input, "crmStatus");
  const primaryGoal = readValue(input, "primaryGoal");
  const source = readValue(input, "source");
  const priority = readValue(input, "priority");
  const assignedTo = readValue(input, "assignedTo");
  const search = readValue(input, "search")?.trim() ?? "";

  return {
    completionStatus:
      completionStatus === "all"
        ? "all"
        : isCompletionStatus(completionStatus)
          ? completionStatus
          : undefined,
    crmStatus: crmStatus === "all" ? "all" : isCrmStatus(crmStatus) ? crmStatus : undefined,
    primaryGoal:
      primaryGoal === "all" ? "all" : isPrimaryGoal(primaryGoal) ? primaryGoal : undefined,
    source: source === "all" ? "all" : isLeadSource(source) ? source : undefined,
    priority: priority === "all" ? "all" : isLeadPriority(priority) ? priority : undefined,
    assignedTo: assignedTo?.trim() ? assignedTo.trim() : undefined,
    search: search.length > 0 ? search : undefined,
  };
}

export function buildLeadDashboardStats(leads: LeadRecord[]) {
  return {
    totalLeads: leads.length,
    completedLeads: leads.filter((lead) => lead.completionStatus === "complete").length,
    incompleteLeads: leads.filter((lead) => lead.completionStatus === "incomplete").length,
    qualifiedLeads: leads.filter((lead) =>
      ["qualified", "consultation_booked", "application_started", "documents_pending", "payment_pending", "converted"].includes(lead.crmStatus),
    ).length,
    unqualifiedLeads: leads.filter((lead) => lead.crmStatus === "unqualified").length,
    reportsViewed: leads.filter((lead) => lead.analytics.reportViewed).length,
    whatsappClicks: leads.filter((lead) => lead.analytics.whatsappClicked).length,
    consultationClicks: leads.filter((lead) => lead.analytics.consultationClicked).length,
    googleSheetsPending: leads.filter((lead) => lead.sync.googleSheets.status !== "success").length,
    unassignedLeads: leads.filter((lead) => !lead.assignedTo).length,
    highPriorityLeads: leads.filter((lead) => lead.priority === "high" || lead.priority === "urgent").length,
  };
}
