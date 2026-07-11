import { z } from "zod";

export const SUBMISSION_RULE_OPERATORS = [
  "equals",
  "not_equals",
  "contains",
  "greater_than",
  "less_than",
  "checked",
  "unchecked",
  "empty",
  "not_empty",
] as const;

export const SUBMISSION_RULE_ACTIONS = [
  "set_stage",
  "set_status",
  "set_priority",
  "set_owner",
  "set_source",
  "set_opportunity_status",
  "set_opportunity_value",
  "create_task",
  "qualify_offer_and_create_call",
] as const;

export const OPPORTUNITY_RULE_STATUSES = [
  "active",
  "qualified",
  "unqualified",
  "lost",
  "won",
  "on_hold",
] as const;

export const AUTOMATION_TASK_DUE_PRESETS = [
  "later_today",
  "tomorrow",
  "in_3_days",
  "next_week",
  "none",
] as const;

export type SubmissionRuleOperator = (typeof SUBMISSION_RULE_OPERATORS)[number];
export type SubmissionRuleAction = (typeof SUBMISSION_RULE_ACTIONS)[number];

const VALUE_FREE_OPERATORS = new Set<SubmissionRuleOperator>([
  "checked",
  "unchecked",
  "empty",
  "not_empty",
]);

export const submissionRulePayloadSchema = z
  .object({
    name: z.string().trim().min(1, "Rule name is required.").max(120),
    conditionFieldId: z.string().uuid("Choose a valid form field."),
    conditionOperator: z.enum(SUBMISSION_RULE_OPERATORS),
    conditionValue: z.string().trim().nullable().optional(),
    actionType: z.enum(SUBMISSION_RULE_ACTIONS),
    actionTarget: z.string().trim().nullable().optional(),
    actionValue: z.string().trim().min(1, "Choose the routing value."),
    isActive: z.boolean().default(true),
    order: z.coerce.number().int().min(0).default(0),
  })
  .superRefine((value, context) => {
    if (!VALUE_FREE_OPERATORS.has(value.conditionOperator) && !value.conditionValue?.trim()) {
      context.addIssue({
        code: "custom",
        message: "Add a comparison value for this operator.",
        path: ["conditionValue"],
      });
    }
    if (
      (value.actionType === "set_opportunity_status" ||
        value.actionType === "set_opportunity_value" ||
        value.actionType === "qualify_offer_and_create_call") &&
      !value.actionTarget?.trim()
    ) {
      context.addIssue({
        code: "custom",
        message: "Add the offer name this rule should update.",
        path: ["actionTarget"],
      });
    }
    if (value.actionType === "create_task" && !value.actionTarget?.trim()) {
      context.addIssue({
        code: "custom",
        message: "Add the task title this rule should create.",
        path: ["actionTarget"],
      });
    }
    if (
      value.actionType === "set_opportunity_status" &&
      !OPPORTUNITY_RULE_STATUSES.includes(
        value.actionValue as (typeof OPPORTUNITY_RULE_STATUSES)[number],
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "Choose a valid offer status.",
        path: ["actionValue"],
      });
    }
    if (
      value.actionType === "set_opportunity_value" &&
      (!Number.isFinite(Number(value.actionValue)) || Number(value.actionValue) < 0)
    ) {
      context.addIssue({
        code: "custom",
        message: "Potential value must be zero or greater.",
        path: ["actionValue"],
      });
    }
    if (
      (value.actionType === "create_task" ||
        value.actionType === "qualify_offer_and_create_call") &&
      !AUTOMATION_TASK_DUE_PRESETS.includes(
        value.actionValue as (typeof AUTOMATION_TASK_DUE_PRESETS)[number],
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "Choose when the automated task should be due.",
        path: ["actionValue"],
      });
    }
  });

export const autoQualifyRuleSchema = z
  .object({
    fieldId: z.string().uuid("Choose a valid form field."),
    operator: z.enum(SUBMISSION_RULE_OPERATORS),
    value: z.string().trim().nullable().optional(),
    stageKey: z.string().trim().min(1, "Choose a destination stage."),
    markAsQualified: z.boolean().optional(),
  })
  .superRefine((value, context) => {
    if (!VALUE_FREE_OPERATORS.has(value.operator) && !value.value?.trim()) {
      context.addIssue({
        code: "custom",
        message: "Add a comparison value for this rule.",
        path: ["value"],
      });
    }
  });

export const autoQualifyRulesSchema = z
  .array(autoQualifyRuleSchema)
  .max(20, "Keep automated qualification to twenty rules or fewer.");

export interface SubmissionRuleInput {
  id: string;
  name?: string;
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
  opportunityOverrides: Array<{
    offerLabel: string;
    status: (typeof OPPORTUNITY_RULE_STATUSES)[number] | null;
    estimatedValue: number | null;
    reason: string | null;
  }>;
  taskOverrides: Array<{
    title: string;
    duePreset: (typeof AUTOMATION_TASK_DUE_PRESETS)[number];
    sourceRuleId: string;
  }>;
}

export function mergeSubmissionRuleEvaluations(
  ...evaluations: SubmissionRuleEvaluation[]
): SubmissionRuleEvaluation {
  const merged: SubmissionRuleEvaluation = {
    appliedRules: [],
    leadOverrides: {
      assignedTo: null,
      priority: null,
      source: null,
      stageValue: null,
    },
    opportunityOverrides: [],
    taskOverrides: [],
  };
  const opportunitiesByLabel = new Map<
    string,
    SubmissionRuleEvaluation["opportunityOverrides"][number]
  >();

  for (const evaluation of evaluations) {
    merged.appliedRules.push(...evaluation.appliedRules);
    for (const key of Object.keys(merged.leadOverrides) as Array<
      keyof SubmissionRuleEvaluation["leadOverrides"]
    >) {
      if (evaluation.leadOverrides[key] !== null) {
        merged.leadOverrides[key] = evaluation.leadOverrides[key];
      }
    }
    for (const opportunity of evaluation.opportunityOverrides) {
      const key = opportunity.offerLabel.trim().toLowerCase();
      const existing = opportunitiesByLabel.get(key) ?? {
        offerLabel: opportunity.offerLabel,
        status: null,
        estimatedValue: null,
        reason: null,
      };
      opportunitiesByLabel.set(key, {
        offerLabel: opportunity.offerLabel,
        status: opportunity.status ?? existing.status,
        estimatedValue: opportunity.estimatedValue ?? existing.estimatedValue,
        reason: opportunity.reason ?? existing.reason,
      });
    }
    for (const task of evaluation.taskOverrides) {
      const duplicate = merged.taskOverrides.some(
        (existing) =>
          existing.title.trim().toLowerCase() === task.title.trim().toLowerCase() &&
          existing.duePreset === task.duePreset,
      );
      if (!duplicate) {
        merged.taskOverrides.push(task);
      }
    }
  }

  merged.opportunityOverrides = [...opportunitiesByLabel.values()];

  return merged;
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
  const opportunitiesByLabel = new Map<
    string,
    SubmissionRuleEvaluation["opportunityOverrides"][number]
  >();
  const taskOverrides: SubmissionRuleEvaluation["taskOverrides"] = [];

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
      case "set_opportunity_status": {
        const offerLabel = rule.actionTarget?.trim();
        const status = rule.actionValue as (typeof OPPORTUNITY_RULE_STATUSES)[number] | null;
        if (!offerLabel || !status || !OPPORTUNITY_RULE_STATUSES.includes(status)) {
          break;
        }
        const key = offerLabel.toLowerCase();
        const existing = opportunitiesByLabel.get(key) ?? {
          offerLabel,
          status: null,
          estimatedValue: null,
          reason: null,
        };
        opportunitiesByLabel.set(key, {
          ...existing,
          status,
          reason:
            status === "lost" || status === "unqualified"
              ? `Automated qualification rule: ${rule.name?.trim() || rule.id}`
              : existing.reason,
        });
        break;
      }
      case "set_opportunity_value": {
        const offerLabel = rule.actionTarget?.trim();
        const estimatedValue = Number(rule.actionValue);
        if (!offerLabel || !Number.isFinite(estimatedValue) || estimatedValue < 0) {
          break;
        }
        const key = offerLabel.toLowerCase();
        const existing = opportunitiesByLabel.get(key) ?? {
          offerLabel,
          status: null,
          estimatedValue: null,
          reason: null,
        };
        opportunitiesByLabel.set(key, { ...existing, estimatedValue });
        break;
      }
      case "create_task": {
        const title = rule.actionTarget?.trim();
        const duePreset = rule.actionValue as (typeof AUTOMATION_TASK_DUE_PRESETS)[number];
        if (!title || !AUTOMATION_TASK_DUE_PRESETS.includes(duePreset)) {
          break;
        }
        taskOverrides.push({ title, duePreset, sourceRuleId: rule.id });
        break;
      }
      case "qualify_offer_and_create_call": {
        const offerLabel = rule.actionTarget?.trim();
        const duePreset = rule.actionValue as (typeof AUTOMATION_TASK_DUE_PRESETS)[number];
        if (!offerLabel || !AUTOMATION_TASK_DUE_PRESETS.includes(duePreset)) {
          break;
        }
        const key = offerLabel.toLowerCase();
        const existing = opportunitiesByLabel.get(key) ?? {
          offerLabel,
          status: null,
          estimatedValue: null,
          reason: null,
        };
        opportunitiesByLabel.set(key, { ...existing, status: "qualified", reason: null });
        taskOverrides.push({
          title: `Call about ${offerLabel}`,
          duePreset,
          sourceRuleId: rule.id,
        });
        break;
      }
      default:
        break;
    }
  }

  return {
    appliedRules,
    leadOverrides,
    opportunityOverrides: [...opportunitiesByLabel.values()],
    taskOverrides,
  };
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
        name: `Auto qualification ${index + 1}`,
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
