"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { GlassSurface } from "@/components/admin/ui/GlassSurface";
import { SmoothButton } from "@/components/admin/ui/SmoothButton";
import { GradientText } from "@/components/admin/ui/GradientText";
import { AnimatedCard } from "@/components/admin/ui/AnimatedCard";
import { SectionHeader } from "@/components/admin/ui/SectionHeader";
import { AdminSelect } from "@/components/admin/AdminSelect";
import {
  AUTOMATION_TASK_DUE_PRESETS,
  OPPORTUNITY_RULE_STATUSES,
} from "@/lib/crm/form-submission-routing";
import { crmLabelize } from "@/lib/crm/formatters";
import {
  Plus,
  Trash2,
  Edit3,
  ToggleRight,
  ToggleLeft,
  X,
  Save,
  AlertCircle,
  Zap,
  ArrowRight,
} from "lucide-react";

export type RuleOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "greater_than"
  | "less_than"
  | "checked"
  | "unchecked"
  | "empty"
  | "not_empty";

export type RuleActionType =
  | "set_stage"
  | "set_priority"
  | "set_owner"
  | "set_source"
  | "set_opportunity_status"
  | "set_opportunity_value"
  | "create_task"
  | "qualify_offer_and_create_call";

export interface FormRuleData {
  id: string;
  formId: string;
  name: string;
  conditionFieldId: string;
  conditionOperator: RuleOperator;
  conditionValue?: string | null;
  actionType: RuleActionType;
  actionTarget?: string | null;
  actionValue?: string | null;
  isActive: boolean;
  order: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

interface FormRulesEditorProps {
  formId: string;
  initialFields: unknown[];
  initialRules: unknown[];
  stageOptions: Array<{ value: string; label: string }>;
  sourceOptions: Array<{ value: string; label: string }>;
  ownerOptions: Array<{ value: string; label: string }>;
}

const OPERATOR_LABELS: Record<RuleOperator, string> = {
  equals: "equals",
  not_equals: "does not equal",
  contains: "contains",
  greater_than: "is greater than",
  less_than: "is less than",
  checked: "is checked",
  unchecked: "is unchecked",
  empty: "is empty",
  not_empty: "is not empty",
};

const ACTION_TYPE_LABELS: Record<RuleActionType, string> = {
  set_stage: "Move to Stage",
  set_priority: "Set Priority",
  set_owner: "Set Owner",
  set_source: "Set Source",
  set_opportunity_status: "Set Offer Status",
  set_opportunity_value: "Set Offer Value",
  create_task: "Create Owner Task",
  qualify_offer_and_create_call: "Qualify Offer + Create Call",
};

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const OPPORTUNITY_STATUS_OPTIONS = OPPORTUNITY_RULE_STATUSES.map((status) => ({
  value: status,
  label: crmLabelize(status),
}));

const TASK_DUE_OPTIONS = AUTOMATION_TASK_DUE_PRESETS.map((preset) => ({
  value: preset,
  label: {
    later_today: "Later today",
    tomorrow: "Tomorrow",
    in_3_days: "In 3 days",
    next_week: "Next week",
    none: "No due date",
  }[preset],
}));

interface RuleField {
  id: string;
  label: string;
  fieldType: string;
}

let tempRuleCounter = 0;

function createTempRuleId() {
  tempRuleCounter += 1;
  return `temp-${tempRuleCounter}`;
}

function buildRuleSummary(rule: FormRuleData, fields: RuleField[]): string {
  const field = fields.find((f) => f.id === rule.conditionFieldId);
  const fieldName = field?.label || "Unknown field";
  const operator = OPERATOR_LABELS[rule.conditionOperator] || rule.conditionOperator;
  const actionLabel = ACTION_TYPE_LABELS[rule.actionType] || rule.actionType;
  const actionValue = rule.actionValue ? ` to "${rule.actionValue}"` : "";
  const actionTarget = rule.actionTarget ? ` for "${rule.actionTarget}"` : "";

  if (["checked", "unchecked", "empty", "not_empty"].includes(rule.conditionOperator)) {
    return `If "${fieldName}" ${operator}, then ${actionLabel.toLowerCase()}${actionTarget}${actionValue}`;
  }
  return `If "${fieldName}" ${operator} "${rule.conditionValue || ""}", then ${actionLabel.toLowerCase()}${actionTarget}${actionValue}`;
}

function operatorNeedsValue(operator: RuleOperator) {
  return !["checked", "unchecked", "empty", "not_empty"].includes(operator);
}

export function FormRulesEditor({
  formId,
  initialFields,
  initialRules,
  stageOptions,
  sourceOptions,
  ownerOptions,
}: FormRulesEditorProps) {
  const fields = (initialFields as RuleField[]).map((f) => ({
    id: f.id,
    label: f.label || "Untitled Field",
    fieldType: f.fieldType || "text",
  }));

  const [rules, setRules] = useState<FormRuleData[]>(
    (initialRules as Array<Omit<FormRuleData, "actionType"> & { actionType: string }>)
      .filter((rule) => rule.actionType === "set_status" || rule.actionType in ACTION_TYPE_LABELS)
      .map((rule) => ({
        ...rule,
        actionType: rule.actionType === "set_status" ? "set_stage" : rule.actionType as RuleActionType,
      }))
      .sort((a, b) => a.order - b.order),
  );
  const [editingRule, setEditingRule] = useState<FormRuleData | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createDraft = (): FormRuleData => {
    const maxOrder = rules.length > 0 ? Math.max(...rules.map((r) => r.order)) : -1;
    return {
      id: createTempRuleId(),
      formId,
      name: "",
      conditionFieldId: fields[0]?.id ?? "",
      conditionOperator: "equals",
      conditionValue: "",
      actionType: "set_stage",
      actionTarget: null,
      actionValue: stageOptions[0]?.value ?? null,
      isActive: true,
      order: maxOrder + 1,
    };
  };

  const handleToggleActive = async (rule: FormRuleData) => {
    try {
      const res = await fetch(`/api/admin/forms/${formId}/rules/${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !rule.isActive }),
      });
      if (!res.ok) throw new Error("Failed to update rule");
      const data = await res.json();
      setRules(rules.map((r) => (r.id === rule.id ? data.rule : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm("Delete this rule? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/forms/${formId}/rules/${ruleId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete rule");
      setRules(rules.filter((r) => r.id !== ruleId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleSave = async (rule: FormRuleData) => {
    setSaving(true);
    setError(null);
    try {
      const isNew = rule.id.startsWith("temp-");
      const payload = {
        ...rule,
        conditionValue: rule.conditionValue ?? null,
        actionTarget: rule.actionTarget ?? null,
        actionValue: rule.actionValue ?? null,
      };

      if (isNew) {
        const res = await fetch(`/api/admin/forms/${formId}/rules`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to create rule");
        const data = await res.json();
        setRules([...rules, data.rule]);
      } else {
        const res = await fetch(`/api/admin/forms/${formId}/rules/${rule.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update rule");
        const data = await res.json();
        setRules(rules.map((r) => (r.id === rule.id ? data.rule : r)));
      }
      setEditingRule(null);
      setIsCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const openEditor = (rule: FormRuleData) => {
    setEditingRule({ ...rule });
    setIsCreating(false);
    setError(null);
  };

  const startCreating = () => {
    setEditingRule(createDraft());
    setIsCreating(true);
    setError(null);
  };

  const closeEditor = () => {
    setEditingRule(null);
    setIsCreating(false);
    setError(null);
  };

  const updateDraft = (updates: Partial<FormRuleData>) => {
    setEditingRule((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const getActionValueOptions = (actionType: RuleActionType) => {
    switch (actionType) {
      case "set_stage":
        return stageOptions;
      case "set_priority":
        return PRIORITY_OPTIONS;
      case "set_owner":
        return ownerOptions;
      case "set_source":
        return sourceOptions;
      case "set_opportunity_status":
        return OPPORTUNITY_STATUS_OPTIONS;
      case "create_task":
      case "qualify_offer_and_create_call":
        return TASK_DUE_OPTIONS;
      default:
        return [];
    }
  };
  const currentActionValueOptions = editingRule
    ? getActionValueOptions(editingRule.actionType)
    : [];
  const isOpportunityAction = editingRule
    ? editingRule.actionType === "set_opportunity_status" ||
      editingRule.actionType === "set_opportunity_value" ||
      editingRule.actionType === "qualify_offer_and_create_call"
    : false;
  const isTaskAction = editingRule
    ? editingRule.actionType === "create_task" ||
      editingRule.actionType === "qualify_offer_and_create_call"
    : false;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Conditional Rules"
        description="Automatically qualify leads and trigger actions based on form responses."
        variant="compact"
        actions={
          <SmoothButton size="sm" icon={<Plus className="h-4 w-4" />} onClick={startCreating}>
            Add Rule
          </SmoothButton>
        }
      />

      {error && (
        <div className="flex items-center gap-2 rounded-[16px] border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-3">
        {rules.length === 0 ? (
          <GlassSurface intensity="soft" className="py-12 text-center">
            <p className="text-sm text-white/70">No rules yet. Click Add Rule to automate lead qualification.</p>
          </GlassSurface>
        ) : (
          rules.map((rule, idx) => (
            <AnimatedCard key={rule.id} variant="subtle" delay={idx * 50}>
              <div className="flex items-start gap-3 p-4">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] border border-white/10 bg-white/[0.06] text-[var(--ld-color-accent)]">
                  <Zap className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{rule.name || "Untitled Rule"}</span>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        rule.isActive
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-white/10 text-white/50"
                      )}
                    >
                      {rule.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-white/70">
                    {buildRuleSummary(rule, fields)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <SmoothButton
                    variant="ghost"
                    size="sm"
                    icon={rule.isActive ? <ToggleRight className="h-4 w-4 text-emerald-400" /> : <ToggleLeft className="h-4 w-4 text-white/40" />}
                    onClick={() => handleToggleActive(rule)}
                    className="h-8 w-8 px-0"
                    title={rule.isActive ? "Deactivate" : "Activate"}
                  >
                    <span className="sr-only">{rule.isActive ? "Deactivate" : "Activate"}</span>
                  </SmoothButton>
                  <SmoothButton
                    variant="ghost"
                    size="sm"
                    icon={<Edit3 className="h-3.5 w-3.5" />}
                    onClick={() => openEditor(rule)}
                    className="h-8 w-8 px-0"
                  >
                    <span className="sr-only">Edit</span>
                  </SmoothButton>
                  <SmoothButton
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={() => handleDelete(rule.id)}
                    className="h-8 w-8 px-0 text-red-400 hover:text-red-300"
                  >
                    <span className="sr-only">Delete</span>
                  </SmoothButton>
                </div>
              </div>
            </AnimatedCard>
          ))
        )}
      </div>

      <SmoothButton
        variant="secondary"
        size="md"
        icon={<Plus className="h-4 w-4" />}
        onClick={startCreating}
        className="w-full sm:w-auto"
      >
        Add Another Rule
      </SmoothButton>

      {editingRule && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeEditor} />
          <GlassSurface
            intensity="strong"
            className="relative z-10 flex max-h-[90vh] w-full flex-col rounded-t-[28px] border border-white/15 sm:max-w-lg sm:rounded-[28px]"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h3 className="text-lg font-semibold text-white">
                <GradientText>{isCreating ? "New Rule" : "Edit Rule"}</GradientText>
              </h3>
              <button
                onClick={closeEditor}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[12px] border border-white/10 bg-white/[0.06] text-white/70 transition hover:bg-white/[0.12] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/90">Rule Name</label>
                  <input
                    type="text"
                    value={editingRule.name}
                    onChange={(e) => updateDraft({ name: e.target.value })}
                    placeholder="e.g., High Budget Qualifier"
                    className="admin-input w-full"
                  />
                </div>

                <div className="rounded-[18px] border-l-4 border-l-[var(--ld-color-primary)]/60 bg-white/[0.03] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-[8px] bg-[var(--ld-color-primary)]/20 text-xs font-bold text-[var(--ld-color-primary)]">
                      IF
                    </span>
                    <span className="text-sm font-semibold text-white/90">Condition</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs text-white/70">Field</label>
                      <AdminSelect
                        value={editingRule.conditionFieldId}
                        onChange={(e) => updateDraft({ conditionFieldId: e.target.value })}
                      >
                        {fields.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.label}
                          </option>
                        ))}
                      </AdminSelect>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-white/70">Operator</label>
                      <AdminSelect
                        value={editingRule.conditionOperator}
                        onChange={(e) => updateDraft({ conditionOperator: e.target.value as RuleOperator })}
                      >
                        {(Object.keys(OPERATOR_LABELS) as RuleOperator[]).map((op) => (
                          <option key={op} value={op}>
                            {OPERATOR_LABELS[op]}
                          </option>
                        ))}
                      </AdminSelect>
                    </div>
                    {operatorNeedsValue(editingRule.conditionOperator) && (
                      <div>
                        <label className="mb-1 block text-xs text-white/70">Value</label>
                        <input
                          type="text"
                          value={editingRule.conditionValue ?? ""}
                          onChange={(e) => updateDraft({ conditionValue: e.target.value || null })}
                          placeholder="Expected value"
                          className="admin-input w-full"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-[18px] border-l-4 border-l-[var(--ld-color-accent)]/60 bg-white/[0.03] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-[8px] bg-[var(--ld-color-accent)]/20 text-xs font-bold text-[var(--ld-color-accent)]">
                      THEN
                    </span>
                    <span className="text-sm font-semibold text-white/90">Action</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs text-white/70">Action Type</label>
                      <AdminSelect
                        value={editingRule.actionType}
                        onChange={(e) => {
                          const actionType = e.target.value as RuleActionType;
                          updateDraft({
                            actionType,
                            actionTarget: null,
                            actionValue:
                              actionType === "set_opportunity_value"
                                ? ""
                                : getActionValueOptions(actionType)[0]?.value ?? null,
                          });
                        }}
                      >
                        {(Object.keys(ACTION_TYPE_LABELS) as RuleActionType[]).map((action) => (
                          <option key={action} value={action}>
                            {ACTION_TYPE_LABELS[action]}
                          </option>
                        ))}
                      </AdminSelect>
                    </div>

                    {isOpportunityAction || editingRule.actionType === "create_task" ? (
                      <div>
                        <label className="mb-1 block text-xs text-white/70">
                          {editingRule.actionType === "create_task" ? "Task title" : "Offer name"}
                        </label>
                        <input
                          type="text"
                          value={editingRule.actionTarget ?? ""}
                          onChange={(event) => updateDraft({ actionTarget: event.target.value || null })}
                          placeholder={editingRule.actionType === "create_task" ? "Call about Premium plan" : "Premium plan"}
                          className="admin-input w-full"
                        />
                      </div>
                    ) : null}

                    <div>
                      <label className="mb-1 block text-xs text-white/70">
                        {editingRule.actionType === "set_opportunity_value"
                          ? "Potential value"
                          : isTaskAction
                            ? "Task due"
                            : "Routing value"}
                      </label>
                      {editingRule.actionType === "set_opportunity_value" ? (
                        <input
                          type="number"
                          min="0"
                          value={editingRule.actionValue ?? ""}
                          onChange={(event) => updateDraft({ actionValue: event.target.value || null })}
                          placeholder="250000"
                          className="admin-input w-full"
                        />
                      ) : (
                        <AdminSelect
                          value={editingRule.actionValue ?? ""}
                          onChange={(e) => updateDraft({ actionValue: e.target.value || null })}
                        >
                          <option value="">Select value</option>
                          {currentActionValueOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </AdminSelect>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-[14px] border border-white/10 bg-white/[0.03] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Preview</p>
                  <p className="mt-1 text-sm text-white/80">
                    <ArrowRight className="mr-1 inline h-3.5 w-3.5 text-white/40" />
                    {buildRuleSummary(editingRule, fields)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/10 px-6 py-4">
              <SmoothButton variant="ghost" onClick={closeEditor}>
                Cancel
              </SmoothButton>
              <SmoothButton
                variant="primary"
                icon={<Save className="h-4 w-4" />}
                loading={saving}
                disabled={
                  !editingRule.name.trim() ||
                  !editingRule.conditionFieldId ||
                  !editingRule.actionValue ||
                  (isOpportunityAction && !editingRule.actionTarget?.trim()) ||
                  (operatorNeedsValue(editingRule.conditionOperator) && !editingRule.conditionValue?.trim())
                }
                onClick={() => handleSave(editingRule)}
              >
                {isCreating ? "Create Rule" : "Save Changes"}
              </SmoothButton>
            </div>
          </GlassSurface>
        </div>
      )}
    </div>
  );
}
