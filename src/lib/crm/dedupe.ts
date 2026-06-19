import { emptyAnswers } from "@/lib/assessment/defaults";
import type { AssessmentAnswers } from "@/lib/crm/types";

export function normalizeEmail(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

export function normalizePhone(value?: string | null) {
  return value?.trim().replace(/[^\d+]/g, "") ?? "";
}

export function normalizeText(value?: string | null) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export function mergeAssessmentAnswers(
  existing: AssessmentAnswers | null | undefined,
  incoming: Partial<AssessmentAnswers> | null | undefined,
) {
  const base = existing ?? emptyAnswers;
  if (!incoming) {
    return base;
  }

  return {
    ...base,
    ...Object.fromEntries(
      Object.entries(incoming).filter(([, value]) => value !== undefined),
    ),
  } as AssessmentAnswers;
}

export function pickPreferredValue<T>(existing: T | null | undefined, incoming: T | null | undefined) {
  if (existing === null || existing === undefined || existing === "") {
    return incoming ?? null;
  }

  return existing;
}
