import {
  isCrmStatus,
  isLeadPriority,
  isLeadSource,
} from "@/lib/crm/status";
import type { LeadRecord } from "@/lib/crm/types";
import type { LeadListFilters } from "@/lib/storage/types";

type QueryLike = URLSearchParams | Record<string, string | string[] | undefined>;

function readValue(input: QueryLike, key: string) {
  if (input instanceof URLSearchParams) {
    return input.get(key) ?? undefined;
  }

  const value = input[key];
  return Array.isArray(value) ? value[0] : value;
}

export function parseLeadListFilters(input: QueryLike): LeadListFilters {
  const stage = readValue(input, "stage") ?? readValue(input, "crmStatus");
  const source = readValue(input, "source");
  const priority = readValue(input, "priority");
  const assignedTo = readValue(input, "assignedTo");
  const search = readValue(input, "search")?.trim() ?? "";

  return {
    stageId: stage === "all" ? "all" : isCrmStatus(stage) ? stage : undefined,
    source: source === "all" ? "all" : isLeadSource(source) ? source : undefined,
    priority: priority === "all" ? "all" : isLeadPriority(priority) ? priority : undefined,
    assignedTo: assignedTo?.trim() ? assignedTo.trim() : undefined,
    search: search.length > 0 ? search : undefined,
  };
}

export function buildLeadDashboardStats(leads: LeadRecord[]) {
  return {
    totalLeads: leads.length,
    completedLeads: leads.filter((lead) => Boolean(lead.wonAt || lead.lostAt)).length,
    incompleteLeads: leads.filter((lead) => !lead.wonAt && !lead.lostAt).length,
    qualifiedLeads: leads.filter((lead) => Boolean(lead.stageId) || Boolean(lead.wonAt)).length,
    unqualifiedLeads: leads.filter((lead) => Boolean(lead.lostAt)).length,
    reportsViewed: 0,
    whatsappClicks: 0,
    consultationClicks: 0,
    googleSheetsPending: 0,
    unassignedLeads: leads.filter((lead) => !lead.assignedTo).length,
    highPriorityLeads: leads.filter((lead) => lead.priority === "high" || lead.priority === "urgent").length,
  };
}
