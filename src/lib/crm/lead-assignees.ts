import { normalizeAdminEmail } from "@/lib/admin-access";

const LEAD_ASSIGNEE_SEPARATOR = "|";

function normalizeLeadAssigneeEmail(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return "";
  }

  return normalizeAdminEmail(trimmed);
}

export function parseLeadAssignees(value?: string | null) {
  if (!value) {
    return [] as string[];
  }

  const unique = new Set<string>();

  for (const part of value.split(LEAD_ASSIGNEE_SEPARATOR)) {
    const normalized = normalizeLeadAssigneeEmail(part);
    if (normalized) {
      unique.add(normalized);
    }
  }

  return [...unique];
}

export function serializeLeadAssignees(values: Array<string | null | undefined>) {
  const unique = new Set<string>();

  for (const value of values) {
    const normalized = normalizeLeadAssigneeEmail(value);
    if (normalized) {
      unique.add(normalized);
    }
  }

  const assignees = [...unique];
  return assignees.length > 0 ? assignees.join(LEAD_ASSIGNEE_SEPARATOR) : null;
}

export function buildLeadAssigneeList(input?: {
  primary?: string | null;
  all?: Array<string | null | undefined> | null;
}) {
  return parseLeadAssignees(serializeLeadAssignees([input?.primary, ...(input?.all ?? [])]));
}

export function getPrimaryLeadAssignee(value?: string | null) {
  return parseLeadAssignees(value)[0] ?? null;
}

export function leadHasAssignee(
  value: string | null | undefined,
  currentUserEmail?: string | null,
) {
  const normalizedTarget = normalizeLeadAssigneeEmail(currentUserEmail);
  if (!normalizedTarget) {
    return false;
  }

  return parseLeadAssignees(value).includes(normalizedTarget);
}

export function formatLeadAssigneeSummary(assignees: Array<string | null | undefined>) {
  const normalized = buildLeadAssigneeList({ all: assignees });
  if (normalized.length === 0) {
    return { primary: null, additionalCount: 0, all: [] as string[] };
  }

  return {
    primary: normalized[0] ?? null,
    additionalCount: Math.max(0, normalized.length - 1),
    all: normalized,
  };
}
