import assert from "node:assert/strict";
import test from "node:test";
import {
  applySubmissionRules,
  normalizeAutoQualifyRules,
  normalizeStageLookupValue,
  evaluateSubmissionCondition,
  mergeSubmissionRuleEvaluations,
  submissionRulePayloadSchema,
} from "@/lib/crm/form-submission-routing";

test("submission rules support text, checkbox, and empty-state evaluation", () => {
  assert.equal(evaluateSubmissionCondition(" - ", "equals", "-"), true);
  assert.equal(evaluateSubmissionCondition(["sms", "email"], "contains", "email"), true);
  assert.equal(evaluateSubmissionCondition(true, "checked", null), true);
  assert.equal(evaluateSubmissionCondition("", "empty", null), true);
  assert.equal(evaluateSubmissionCondition("ready", "not_empty", null), true);
});

test("auto-qualify rules normalize to stage actions", () => {
  const rules = normalizeAutoQualifyRules([
    { fieldId: "budget", operator: "equals", value: "-", markAsQualified: true },
    { fieldId: "timeline", operator: "not_empty", stageKey: "proposal" },
  ]);

  assert.equal(rules.length, 2);
  assert.equal(rules[0]?.actionType, "set_stage");
  assert.equal(rules[0]?.actionValue, "qualified");
  assert.equal(rules[1]?.actionValue, "proposal");
});

test("explicit submission rules override lead routing fields", () => {
  const evaluation = applySubmissionRules(
    [
      {
        id: "rule-1",
        isActive: true,
        conditionFieldId: "fit",
        conditionOperator: "equals",
        conditionValue: "good",
        actionType: "set_stage",
        actionTarget: null,
        actionValue: "qualified",
      },
      {
        id: "rule-2",
        isActive: true,
        conditionFieldId: "fit",
        conditionOperator: "equals",
        conditionValue: "good",
        actionType: "set_priority",
        actionTarget: null,
        actionValue: "high",
      },
    ],
    { fit: "good" },
    new Set(["fit"]),
  );

  assert.equal(evaluation.appliedRules.length, 2);
  assert.equal(evaluation.leadOverrides.stageValue, "qualified");
  assert.equal(evaluation.leadOverrides.priority, "high");
});

test("stage lookup aliases map legacy values to live stages", () => {
  assert.equal(normalizeStageLookupValue("closed_won"), "won");
  assert.equal(normalizeStageLookupValue("unqualified"), "lost");
  assert.equal(normalizeStageLookupValue("Negotiation"), "proposal");
});

test("rule contracts accept dash qualification and reject unsupported actions", () => {
  const parsed = submissionRulePayloadSchema.safeParse({
    name: "Qualify a dash answer",
    conditionFieldId: "11111111-1111-4111-8111-111111111111",
    conditionOperator: "equals",
    conditionValue: "-",
    actionType: "set_stage",
    actionValue: "qualified",
    isActive: true,
    order: 0,
  });

  assert.equal(parsed.success, true);
  assert.equal(
    submissionRulePayloadSchema.safeParse({
      name: "Unsupported email action",
      conditionFieldId: "11111111-1111-4111-8111-111111111111",
      conditionOperator: "equals",
      conditionValue: "-",
      actionType: "send_email",
      actionValue: "sales@example.com",
    }).success,
    false,
  );
});

test("rule contracts require a comparison value only when the operator needs one", () => {
  const base = {
    name: "Route a lead",
    conditionFieldId: "11111111-1111-4111-8111-111111111111",
    actionType: "set_stage" as const,
    actionValue: "qualified",
  };

  assert.equal(
    submissionRulePayloadSchema.safeParse({
      ...base,
      conditionOperator: "equals",
      conditionValue: null,
    }).success,
    false,
  );
  assert.equal(
    submissionRulePayloadSchema.safeParse({
      ...base,
      conditionOperator: "empty",
      conditionValue: null,
    }).success,
    true,
  );
});

test("explicit routing changes only override values they actually set", () => {
  const autoQualification = applySubmissionRules(
    [{
      id: "auto",
      isActive: true,
      conditionFieldId: "fit",
      conditionOperator: "equals",
      conditionValue: "-",
      actionType: "set_stage",
      actionTarget: null,
      actionValue: "qualified",
    }],
    { fit: "-" },
    new Set(["fit"]),
  );
  const explicitPriority = applySubmissionRules(
    [{
      id: "priority",
      isActive: true,
      conditionFieldId: "fit",
      conditionOperator: "equals",
      conditionValue: "-",
      actionType: "set_priority",
      actionTarget: null,
      actionValue: "high",
    }],
    { fit: "-" },
    new Set(["fit"]),
  );

  const merged = mergeSubmissionRuleEvaluations(autoQualification, explicitPriority);
  assert.equal(merged.leadOverrides.stageValue, "qualified");
  assert.equal(merged.leadOverrides.priority, "high");
});

test("offer rules keep qualification and value isolated per product", () => {
  const evaluation = applySubmissionRules(
    [
      {
        id: "starter-fit",
        name: "Starter budget fit",
        isActive: true,
        conditionFieldId: "budget",
        conditionOperator: "less_than",
        conditionValue: "500",
        actionType: "set_opportunity_status",
        actionTarget: "Premium plan",
        actionValue: "unqualified",
      },
      {
        id: "starter-value",
        isActive: true,
        conditionFieldId: "budget",
        conditionOperator: "less_than",
        conditionValue: "500",
        actionType: "set_opportunity_value",
        actionTarget: "Starter plan",
        actionValue: "300",
      },
      {
        id: "starter-qualified",
        isActive: true,
        conditionFieldId: "budget",
        conditionOperator: "less_than",
        conditionValue: "500",
        actionType: "set_opportunity_status",
        actionTarget: "Starter plan",
        actionValue: "qualified",
      },
    ],
    { budget: "250" },
    new Set(["budget"]),
  );

  assert.deepEqual(evaluation.opportunityOverrides, [
    {
      offerLabel: "Premium plan",
      status: "unqualified",
      estimatedValue: null,
      reason: "Automated qualification rule: Starter budget fit",
    },
    {
      offerLabel: "Starter plan",
      status: "qualified",
      estimatedValue: 300,
      reason: null,
    },
  ]);
});

test("offer qualification can create a product-specific owner call", () => {
  const rule = {
    name: "Qualified premium call",
    conditionFieldId: "11111111-1111-4111-8111-111111111111",
    conditionOperator: "equals" as const,
    conditionValue: "yes",
    actionType: "qualify_offer_and_create_call" as const,
    actionTarget: "Premium plan",
    actionValue: "later_today",
    isActive: true,
    order: 0,
  };
  assert.equal(submissionRulePayloadSchema.safeParse(rule).success, true);

  const evaluation = applySubmissionRules(
    [{ ...rule, id: "premium-call" }],
    { [rule.conditionFieldId]: "yes" },
    new Set([rule.conditionFieldId]),
  );

  assert.deepEqual(evaluation.opportunityOverrides, [
    {
      offerLabel: "Premium plan",
      status: "qualified",
      estimatedValue: null,
      reason: null,
    },
  ]);
  assert.deepEqual(evaluation.taskOverrides, [
    {
      title: "Call about Premium plan",
      duePreset: "later_today",
      sourceRuleId: "premium-call",
    },
  ]);
});

test("merged rule evaluations do not duplicate the same automated task", () => {
  const evaluation = applySubmissionRules(
    [
      {
        id: "task-1",
        isActive: true,
        conditionFieldId: "fit",
        conditionOperator: "equals",
        conditionValue: "yes",
        actionType: "create_task",
        actionTarget: "Call qualified lead",
        actionValue: "tomorrow",
      },
    ],
    { fit: "yes" },
    new Set(["fit"]),
  );

  const merged = mergeSubmissionRuleEvaluations(evaluation, evaluation);
  assert.equal(merged.taskOverrides.length, 1);
});
