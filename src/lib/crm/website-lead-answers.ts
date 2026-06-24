import { formatLeadStateLabel } from "@/lib/crm/labels";
import type { LeadRecord } from "@/lib/crm/types";

export interface WebsiteLeadAnswerEntry {
  key: string;
  label: string;
  value: string;
}

const WEBSITE_LEAD_ANSWER_FIELDS = [
  { key: "nigeriaState", label: "State of residence" },
  { key: "highestQualification", label: "Highest qualification" },
  { key: "highestQualificationOther", label: "Other qualification" },
  { key: "degreeClass", label: "Degree classification" },
  { key: "graduationYear", label: "Year of graduation" },
  { key: "olevelCompletionYear", label: "Year completed O'Level" },
  { key: "studiedCourse", label: "Course studied" },
  { key: "desiredCourse", label: "Preferred UK course" },
  { key: "passportStatus", label: "International passport" },
  { key: "targetIntake", label: "Preferred intake" },
  { key: "assessmentReadiness", label: "Formal assessment readiness" },
  { key: "contactTimeline", label: "Preferred contact time" },
  { key: "consent", label: "Consent" },
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeAnswerValue(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeAnswerValue(item))
      .filter(Boolean)
      .join(", ");
  }

  return "";
}

function readAnswerValue(record: Record<string, unknown>, key: string) {
  const value = normalizeAnswerValue(record[key]);
  if (value) {
    return value;
  }

  if (key === "nigeriaState") {
    return (
      normalizeAnswerValue(record.nigeria_state) ||
      normalizeAnswerValue(record.state) ||
      normalizeAnswerValue(record.stateOfResidence)
    );
  }

  return "";
}

export function extractWebsiteLeadAnswers(
  lead: Pick<LeadRecord, "source" | "sourcePayload">,
): WebsiteLeadAnswerEntry[] {
  if (lead.source !== "website_form" || !isRecord(lead.sourcePayload)) {
    return [];
  }

  const answerRecord = isRecord(lead.sourcePayload.answers)
    ? lead.sourcePayload.answers
    : lead.sourcePayload;

  return WEBSITE_LEAD_ANSWER_FIELDS.flatMap((field) => {
    const rawValue = readAnswerValue(answerRecord, field.key);
    if (!rawValue) {
      return [];
    }

    if (field.key === "highestQualificationOther") {
      const selectedQualification = readAnswerValue(answerRecord, "highestQualification");
      if (selectedQualification !== "Other") {
        return [];
      }
    }

    return [
      {
        key: field.key,
        label: field.label,
        value: field.key === "nigeriaState" ? formatLeadStateLabel(rawValue) : rawValue,
      },
    ];
  });
}

export function buildWebsiteLeadAnswerValueMap(
  lead: Pick<LeadRecord, "source" | "sourcePayload">,
) {
  return new Map(
    extractWebsiteLeadAnswers(lead).map((entry) => [entry.key, entry.value]),
  );
}
