import type { LeadPriority } from "@/lib/pathway-engine/types";

const priorityRank: Record<LeadPriority, number> = {
  low: 0,
  medium: 1,
  high: 2,
  urgent: 3,
};

export function elevatePriority(
  existing: LeadPriority,
  incoming?: LeadPriority | null,
): LeadPriority {
  if (!incoming) {
    return existing;
  }

  return priorityRank[incoming] > priorityRank[existing] ? incoming : existing;
}

export function isUnassigned(assignedTo?: string | null) {
  return !assignedTo?.trim();
}
