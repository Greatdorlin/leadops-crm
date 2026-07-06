export type SubmissionRuleOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "greater_than"
  | "less_than"
  | "checked"
  | "unchecked"
  | "empty"
  | "not_empty";

export interface SubmissionRuleInput {
  id: string;
  isActive: boolean;
  conditionFieldId: string;
  conditionOperator: string;
  conditionValue: string | null;
  actionType: string;
  actionTarget: string | null;
  actionValue: string | null;
}

export interface SubmissionRuleEvaluation {
  appliedRules: Array<{ ruleId: string; action: string; result: string }>;
  leadOverrides: {
    assignedTo: string | null;
    priority: string | null;
    source: string | null;
    stageValue: string | null;
  };
}

type AutoQualifyRuleRecord = Record<string, unknown>;

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeBoolean(value: unknown) {
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

function isFilledValue(value: unknown) {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
}

function isCheckedValue(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "number") {
    return value > 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return ["true", "1", "yes", "on", "checked"].includes(normalized);
  }

  return false;
}

function compareAsString(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim().toLowerCase()).join("|");
  }

  return String(value ?? "").trim().toLowerCase();
}

export function evaluateSubmissionCondition(
  fieldValue: unknown,
  operator: string,
  expectedValue: string | null,
): boolean {
  const normalizedOperator = operator as SubmissionRuleOperator;

  switch (normalizedOperator) {
    case "equals":
      return compareAsString(fieldValue) === compareAsString(expectedValue ?? "");
    case "not_equals":
      return compareAsString(fieldValue) !== compareAsString(expectedValue ?? "");
    case "contains":
      if (Array.isArray(fieldValue)) {
        return fieldValue.some(
          (item) => compareAsString(item) === compareAsString(expectedValue ?? ""),
        );
      }

      return compareAsString(fieldValue).includes(compareAsString(expectedValue ?? ""));
    case "greater_than":
      return Number(fieldValue) > Number(expectedValue);
    case "less_than":
      return Number(fieldValue) < Number(expectedValue);
    case "checked":
      return isCheckedValue(fieldValue);
    case "unchecked":
      return !isCheckedValue(fieldValue);
    case "empty":
      return !isFilledValue(fieldValue);
    case "not_empty":
      return isFilledValue(fieldValue);
    default:
      return false;
  }
}

export function applySubmissionRules(
  rules: SubmissionRuleInput[],
  submissionData: Record<string, unknown>,
  availableFieldIds: Set<string>,
): SubmissionRuleEvaluation {
  const appliedRules: SubmissionRuleEvaluation["appliedRules"] = [];
  const leadOverrides: SubmissionRuleEvaluation["leadOverrides"] = {
    assignedTo: null,
    priority: null,
    source: null,
    stageValue: null,
  };

  for (const rule of rules) {
    if (!rule.isActive || !availableFieldIds.has(rule.conditionFieldId)) {
      continue;
    }

    const fieldValue = submissionData[rule.conditionFieldId];
    const matched = evaluateSubmissionCondition(
      fieldValue,
      rule.conditionOperator,
      rule.conditionValue,
    );

    if (!matched) {
      continue;
    }

    appliedRules.push({
      ruleId: rule.id,
      action: rule.actionType,
      result: `matched: ${rule.actionType}`,
    });

    switch (rule.actionType) {
      case "set_status":
      case "set_stage":
        leadOverrides.stageValue = rule.actionValue;
        break;
      case "set_priority":
        leadOverrides.priority = rule.actionValue;
        break;
      case "set_owner":
        leadOverrides.assignedTo = rule.actionValue;
        break;
      case "set_source":
        leadOverrides.source = rule.actionValue;
        break;
      default:
        break;
    }
  }

  return { appliedRules, leadOverrides };
}

export function normalizeAutoQualifyRules(raw: unknown): SubmissionRuleInput[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.flatMap((item, index) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const rule = item as AutoQualifyRuleRecord;
    const fieldId = normalizeString(rule.fieldId);
    if (!fieldId) {
      return [];
    }

    const operator = normalizeString(rule.operator) ?? "equals";
    const stageValue =
      normalizeString(rule.stageKey) ??
      normalizeString(rule.targetStage) ??
      normalizeString(rule.actionValue) ??
      normalizeString(rule.status);

    const shouldMarkQualified =
      stageValue === null && normalizeBoolean(rule.markAsQualified) !== false;

    return [
      {
        id: `auto-qualify-${index}`,
        isActive: true,
        conditionFieldId: fieldId,
        conditionOperator: operator,
        conditionValue: normalizeString(rule.value),
        actionType: "set_stage",
        actionTarget: null,
        actionValue: stageValue ?? (shouldMarkQualified ? "qualified" : null),
      },
    ];
  });
}

const STAGE_VALUE_ALIASES: Record<string, string> = {
  closed_won: "won",
  converted: "won",
  closed_lost: "lost",
  unqualified: "lost",
  negotiation: "proposal",
};

export function normalizeStageLookupValue(value: string | null | undefined) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  const generatedKey = normalized
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");
  return STAGE_VALUE_ALIASES[generatedKey] ?? generatedKey;
}
