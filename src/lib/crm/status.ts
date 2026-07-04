import { CRM_STATUSES, LEAD_PRIORITIES, LEAD_SOURCES } from "@/lib/crm/constants";
import type { CrmStatus, LeadPriority, LeadSource } from "@/lib/crm/types";

export const leadPriorityRank: Record<LeadPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
};

export function isCrmStatus(value: unknown): value is CrmStatus {
  return typeof value === "string" && CRM_STATUSES.includes(value as CrmStatus);
}

export function isLeadPriority(value: unknown): value is LeadPriority {
  return typeof value === "string" && LEAD_PRIORITIES.includes(value as LeadPriority);
}

export function isLeadSource(value: unknown): value is LeadSource {
  return typeof value === "string" && LEAD_SOURCES.includes(value as LeadSource);
}
