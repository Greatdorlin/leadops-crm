import { leadPriorityRank } from "@/lib/crm/status";
import type { LeadPriority } from "@/lib/crm/types";

export function elevatePriority(
  existing: LeadPriority,
  incoming?: LeadPriority | null,
): LeadPriority {
  if (!incoming) {
    return existing;
  }

  return leadPriorityRank[incoming] > leadPriorityRank[existing] ? incoming : existing;
}

export function isUnassigned(assignedTo?: string | null) {
  return !assignedTo?.trim();
}
