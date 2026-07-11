import { LEAD_CUSTOMER_TYPES } from "@/lib/crm/constants";
import {
  isCrmStatus,
  isLeadPriority,
  isLeadSource,
} from "@/lib/crm/status";
import type { LeadRecord } from "@/lib/crm/types";
import type { LeadListFilters } from "@/lib/storage/types";

type QueryLike = URLSearchParams | Record<string, string | string[] | undefined>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  const leadCustomerType = readValue(input, "leadCustomerType");
  const assignedTo = readValue(input, "assignedTo");
  const search = readValue(input, "search")?.trim() ?? "";
  const createdFrom = readValue(input, "createdFrom")?.trim();
  const createdTo = readValue(input, "createdTo")?.trim();

  return {
    stageId: stage === "all" ? "all" : stage && UUID_PATTERN.test(stage) ? stage : undefined,
    status: stage === "all" ? "all" : isCrmStatus(stage) ? stage : undefined,
    source: source === "all" ? "all" : isLeadSource(source) ? source : undefined,
    priority: priority === "all" ? "all" : isLeadPriority(priority) ? priority : undefined,
    leadCustomerType:
      leadCustomerType === "all"
        ? "all"
        : LEAD_CUSTOMER_TYPES.includes(leadCustomerType as (typeof LEAD_CUSTOMER_TYPES)[number])
          ? (leadCustomerType as (typeof LEAD_CUSTOMER_TYPES)[number])
          : undefined,
    assignedTo:
      assignedTo?.trim() && assignedTo !== "__unassigned__" ? assignedTo.trim() : undefined,
    assignment: assignedTo === "__unassigned__" ? "unassigned" : undefined,
    search: search.length > 0 ? search : undefined,
    createdFrom: createdFrom && !Number.isNaN(new Date(createdFrom).getTime()) ? createdFrom : undefined,
    createdTo: createdTo && !Number.isNaN(new Date(createdTo).getTime()) ? createdTo : undefined,
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
