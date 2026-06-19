import {
  COMPLETION_STATUSES,
  CRM_STATUSES,
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  PRIMARY_GOALS,
} from "@/lib/crm/constants";
import type {
  CompletionStatus,
  CrmStatus,
  LeadPriority,
  LeadSource,
  PrimaryGoal,
} from "@/lib/crm/types";

export const leadPriorityRank: Record<LeadPriority, number> = {
  low: 0,
  medium: 1,
  high: 2,
  urgent: 3,
};

export function isCompletionStatus(value?: string): value is CompletionStatus {
  return Boolean(value) && COMPLETION_STATUSES.includes(value as CompletionStatus);
}

export function isCrmStatus(value?: string): value is CrmStatus {
  return Boolean(value) && CRM_STATUSES.includes(value as CrmStatus);
}

export function isLeadSource(value?: string): value is LeadSource {
  return Boolean(value) && LEAD_SOURCES.includes(value as LeadSource);
}

export function isLeadPriority(value?: string): value is LeadPriority {
  return Boolean(value) && LEAD_PRIORITIES.includes(value as LeadPriority);
}

export function isPrimaryGoal(value?: string): value is PrimaryGoal {
  return Boolean(value) && PRIMARY_GOALS.includes(value as PrimaryGoal);
}
