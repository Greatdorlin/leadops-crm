import type {
  CustomFieldDefinition,
  CustomFieldOption,
  CustomFieldType,
} from "@/lib/crm/domain";

export interface CustomFieldDefinitionWithOptions extends CustomFieldDefinition {
  options?: CustomFieldOption[];
}

export interface LeadCustomFieldValueInputRecord {
  customFieldId: string;
  value: unknown;
  displayValue: string | null;
}

export interface CustomFieldInputModel {
  fieldId: string;
  key: string;
  label: string;
  type: CustomFieldType;
  description: string | null;
  placeholder: string | null;
  required: boolean;
  showInForm: boolean;
  showInDetails: boolean;
  searchable: boolean;
  filterable: boolean;
  options: CustomFieldOption[];
  value: unknown;
}

export interface CustomFieldValueValidationResult {
  success: boolean;
  values: LeadCustomFieldValueInputRecord[];
  fieldErrors: Record<string, string>;
}

export interface LeadTableCustomFieldColumn {
  fieldId: string;
  key: string;
  label: string;
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function isBlankValue(value: unknown) {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim().length === 0;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return false;
}

function normalizeDateValue(value: unknown) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
}

function normalizeDateTimeValue(value: unknown) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(normalized) ? normalized : null;
}

function formatNumberValue(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateValue(value: string) {
  return value;
}

function formatDateTimeValue(value: string) {
  return value.replace("T", " ");
}

function getActiveOptionValues(field: CustomFieldDefinitionWithOptions) {
  return new Set((field.options ?? []).filter((option) => !option.archived).map((option) => option.value));
}

export function serializeCustomFieldValue(type: CustomFieldType, value: unknown): unknown | null {
  switch (type) {
    case "text":
    case "textarea":
    case "phone":
    case "email":
    case "url":
    case "user_reference":
    case "file_url":
    case "select":
      return normalizeString(value);
    case "number":
    case "currency": {
      if (value === null || value === undefined || value === "") {
        return null;
      }

      const parsed = typeof value === "number" ? value : Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    case "date":
      return normalizeDateValue(value);
    case "datetime":
      return normalizeDateTimeValue(value);
    case "multi_select": {
      const values = Array.isArray(value)
        ? value
        : typeof value === "string"
          ? value.split(",")
          : [];

      const normalized = [...new Set(values.map((item) => normalizeString(item)).filter((item): item is string => Boolean(item)))];
      return normalized.length > 0 ? normalized : null;
    }
    case "checkbox": {
      if (typeof value === "boolean") {
        return value;
      }

      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (["true", "1", "yes", "on"].includes(normalized)) {
          return true;
        }

        if (["false", "0", "no", "off"].includes(normalized)) {
          return false;
        }
      }

      return null;
    }
    default:
      return null;
  }
}

export function formatCustomFieldDisplayValue(type: CustomFieldType, value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  switch (type) {
    case "checkbox":
      return typeof value === "boolean" ? (value ? "Yes" : "No") : null;
    case "number":
    case "currency":
      return typeof value === "number" ? formatNumberValue(value) : null;
    case "date":
      return typeof value === "string" ? formatDateValue(value) : null;
    case "datetime":
      return typeof value === "string" ? formatDateTimeValue(value) : null;
    case "multi_select":
      return Array.isArray(value) ? value.map((item) => String(item)).join(", ") : null;
    default:
      return typeof value === "string" ? value : String(value);
  }
}

export function buildCustomFieldInputModel(
  definitions: CustomFieldDefinitionWithOptions[],
  existingValues: Array<{ customFieldId: string; value: unknown }> = [],
) {
  const existingValueMap = new Map(existingValues.map((value) => [value.customFieldId, value.value]));

  return definitions
    .filter((field) => !field.archived)
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map<CustomFieldInputModel>((field) => ({
      fieldId: field.id,
      key: field.key,
      label: field.label,
      type: field.type,
      description: field.description,
      placeholder: field.placeholder,
      required: field.required,
      showInForm: field.showInForm,
      showInDetails: field.showInDetails,
      searchable: field.searchable,
      filterable: field.filterable,
      options: (field.options ?? []).filter((option) => !option.archived).sort((left, right) => left.sortOrder - right.sortOrder),
      value:
        existingValueMap.get(field.id) ??
        (field.type === "multi_select" ? [] : field.type === "checkbox" ? false : ""),
    }));
}

export function validateCustomFieldValues(
  definitions: CustomFieldDefinitionWithOptions[],
  submittedValues: Record<string, unknown>,
): CustomFieldValueValidationResult {
  const fieldErrors: Record<string, string> = {};
  const values: LeadCustomFieldValueInputRecord[] = [];

  for (const field of definitions.filter((definition) => !definition.archived)) {
    const rawValue = submittedValues[field.id];
    const serializedValue = serializeCustomFieldValue(field.type, rawValue);
    const activeOptionValues = getActiveOptionValues(field);

    if (
      serializedValue !== null &&
      field.type === "select" &&
      activeOptionValues.size > 0 &&
      (!field.options || !activeOptionValues.has(String(serializedValue)))
    ) {
      fieldErrors[field.id] = `${field.label} must use one of the available options.`;
    }

    if (
      serializedValue !== null &&
      field.type === "multi_select" &&
      Array.isArray(serializedValue) &&
      activeOptionValues.size > 0 &&
      serializedValue.some((item) => !activeOptionValues.has(item))
    ) {
      fieldErrors[field.id] = `${field.label} contains an option that is no longer available.`;
    }

    if (
      serializedValue === null &&
      !isBlankValue(rawValue) &&
      field.type !== "checkbox"
    ) {
      fieldErrors[field.id] = `${field.label} has an invalid value.`;
    }

    if (field.type === "email" && serializedValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(serializedValue))) {
      fieldErrors[field.id] = `${field.label} must be a valid email address.`;
    }

    if (
      (field.type === "url" || field.type === "file_url") &&
      serializedValue
    ) {
      try {
        new URL(String(serializedValue));
      } catch {
        fieldErrors[field.id] = `${field.label} must be a valid URL.`;
      }
    }

    if (field.required) {
      const isMissing =
        serializedValue === null ||
        (Array.isArray(serializedValue) && serializedValue.length === 0);

      if (isMissing) {
        fieldErrors[field.id] = `${field.label} is required.`;
      }
    }

    values.push({
      customFieldId: field.id,
      value: serializedValue,
      displayValue: formatCustomFieldDisplayValue(field.type, serializedValue),
    });
  }

  return {
    success: Object.keys(fieldErrors).length === 0,
    values,
    fieldErrors,
  };
}

export function getTableVisibleCustomFields<T extends {
  archived?: boolean;
  showInTable: boolean;
}>(
  fields: T[],
  options: { limit?: number } = {},
) {
  const limit = options.limit ?? 4;

  return fields
    .filter((field) => !field.archived && field.showInTable)
    .slice(0, limit);
}

export function buildLeadTableCustomFieldColumns(
  leads: Array<{
    customFieldDisplayValues: Array<{
      fieldId: string;
      key: string;
      label: string;
      showInTable: boolean;
    }>;
  }>,
  options: { limit?: number } = {},
): LeadTableCustomFieldColumn[] {
  const limit = options.limit ?? 4;
  const columns: LeadTableCustomFieldColumn[] = [];
  const seen = new Set<string>();

  for (const lead of leads) {
    for (const field of lead.customFieldDisplayValues) {
      if (!field.showInTable || seen.has(field.fieldId)) {
        continue;
      }

      seen.add(field.fieldId);
      columns.push({
        fieldId: field.fieldId,
        key: field.key,
        label: field.label,
      });

      if (columns.length >= limit) {
        return columns;
      }
    }
  }

  return columns;
}
