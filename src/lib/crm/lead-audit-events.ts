export type LeadAuditValue = string | number | boolean | null | string[];

export interface LeadAuditChange {
  field: string;
  label: string;
  before: LeadAuditValue;
  after: LeadAuditValue;
}

interface LeadAuditFieldInput {
  field: string;
  label: string;
  before: unknown;
  after: unknown;
}

function normalizeAuditValue(value: unknown): LeadAuditValue {
  if (value === undefined || value === null || value === "") return null;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  return String(value);
}

export function buildLeadAuditChanges(fields: LeadAuditFieldInput[]): LeadAuditChange[] {
  return fields
    .map((field) => ({
      field: field.field,
      label: field.label,
      before: normalizeAuditValue(field.before),
      after: normalizeAuditValue(field.after),
    }))
    .filter((change) => JSON.stringify(change.before) !== JSON.stringify(change.after));
}

function isLeadAuditChange(value: unknown): value is LeadAuditChange {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LeadAuditChange>;
  return typeof candidate.field === "string" && typeof candidate.label === "string" &&
    Object.prototype.hasOwnProperty.call(candidate, "before") &&
    Object.prototype.hasOwnProperty.call(candidate, "after");
}

function formatAuditValue(value: LeadAuditValue) {
  if (value === null) return "None";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "None";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function formatLeadAuditChanges(eventData: Record<string, unknown> | null) {
  const changes = Array.isArray(eventData?.changes) ? eventData.changes.filter(isLeadAuditChange) : [];
  if (changes.length === 0) return null;
  return changes
    .map((change) => `${change.label}: ${formatAuditValue(change.before)} -> ${formatAuditValue(change.after)}`)
    .join("; ");
}
