import type { FormFieldRow } from "@/lib/db/schema";
import { resolveVisibleFormFields } from "@/lib/crm/form-field-visibility";
import { PUBLIC_FORM_FIELD_TYPES } from "@/lib/crm/public-form";

export const MAX_FORM_SUBMISSION_BODY_BYTES = 256 * 1024;

export interface FormSubmissionValidationResult {
  success: boolean;
  data: Record<string, unknown>;
  fieldErrors: Record<string, string>;
  visibleFieldIds: string[];
}

function isBlank(value: unknown) {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "") ||
    (Array.isArray(value) && value.length === 0)
  );
}

function validateStringRules(
  field: FormFieldRow,
  value: string,
): string | null {
  const rules = field.validationRules ?? {};
  if (typeof rules.minLength === "number" && value.length < rules.minLength) {
    return `${field.label} must be at least ${rules.minLength} characters.`;
  }
  if (typeof rules.maxLength === "number" && value.length > rules.maxLength) {
    return `${field.label} must be at most ${rules.maxLength} characters.`;
  }
  if (typeof rules.pattern === "string" && rules.pattern.length <= 256 && value) {
    try {
      if (!new RegExp(rules.pattern).test(value)) {
        return typeof rules.patternMessage === "string"
          ? rules.patternMessage.slice(0, 240)
          : `${field.label} is invalid.`;
      }
    } catch {
      return `${field.label} has an invalid validation rule.`;
    }
  }
  return null;
}

function normalizeFieldValue(
  field: FormFieldRow,
  value: unknown,
): { value: unknown; error: string | null } {
  if (isBlank(value)) {
    return { value: null, error: null };
  }

  if (!(PUBLIC_FORM_FIELD_TYPES as readonly string[]).includes(field.fieldType)) {
    return { value: null, error: `${field.label} uses an unsupported field type.` };
  }

  if (field.fieldType === "number") {
    const numberValue = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
    if (!Number.isFinite(numberValue)) {
      return { value: null, error: `${field.label} must be a valid number.` };
    }
    const rules = field.validationRules ?? {};
    if (typeof rules.min === "number" && numberValue < rules.min) {
      return { value: null, error: `${field.label} must be at least ${rules.min}.` };
    }
    if (typeof rules.max === "number" && numberValue > rules.max) {
      return { value: null, error: `${field.label} must be at most ${rules.max}.` };
    }
    return { value: numberValue, error: null };
  }

  const optionValues = new Set((field.options ?? []).map((option) => option.value));
  if (field.fieldType === "checkbox") {
    if (!Array.isArray(value) || value.length > 100 || value.some((item) => typeof item !== "string")) {
      return { value: null, error: `${field.label} contains an invalid selection.` };
    }
    const values = [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
    if (optionValues.size > 0 && values.some((item) => !optionValues.has(item))) {
      return { value: null, error: `${field.label} contains an unavailable option.` };
    }
    return { value: values, error: null };
  }

  if (typeof value !== "string") {
    return { value: null, error: `${field.label} has an invalid value.` };
  }
  const stringValue = value.trim();
  const maxLength = field.fieldType === "textarea" ? 10_000 : 2_000;
  if (stringValue.length > maxLength) {
    return { value: null, error: `${field.label} is too long.` };
  }

  if (
    (field.fieldType === "select" || field.fieldType === "radio") &&
    optionValues.size > 0 &&
    !optionValues.has(stringValue)
  ) {
    return { value: null, error: `${field.label} must use an available option.` };
  }
  if (
    field.fieldType === "email" &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stringValue)
  ) {
    return { value: null, error: `${field.label} must be a valid email address.` };
  }
  if (field.fieldType === "date") {
    const date = new Date(`${stringValue}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(stringValue) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== stringValue) {
      return { value: null, error: `${field.label} must be a valid date.` };
    }
  }

  return {
    value: stringValue,
    error: validateStringRules(field, stringValue),
  };
}

export function validateFormSubmissionData(
  fields: FormFieldRow[],
  rawData: Record<string, unknown>,
): FormSubmissionValidationResult {
  const data: Record<string, unknown> = {};
  const fieldErrors: Record<string, string> = {};

  const normalizedValues = new Map<string, ReturnType<typeof normalizeFieldValue>>();
  function readNormalized(field: FormFieldRow) {
    const existing = normalizedValues.get(field.id);
    if (existing) return existing;
    const normalized = normalizeFieldValue(field, rawData[field.id]);
    normalizedValues.set(field.id, normalized);
    return normalized;
  }
  const visibleFields = resolveVisibleFormFields(fields, (field) => {
    const answer = readNormalized(field);
    return answer.error ? undefined : answer.value;
  });

  for (const field of visibleFields) {
    const normalized = readNormalized(field);
    if (normalized.error) {
      fieldErrors[field.id] = normalized.error;
      continue;
    }
    if (field.isRequired && isBlank(normalized.value)) {
      fieldErrors[field.id] = `${field.label} is required.`;
      continue;
    }
    if (!isBlank(normalized.value)) {
      data[field.id] = normalized.value;
    }
  }

  return {
    success: Object.keys(fieldErrors).length === 0,
    data,
    fieldErrors,
    visibleFieldIds: visibleFields.map((field) => field.id),
  };
}
