import assert from "node:assert/strict";
import test from "node:test";
import {
  applySubmissionRules,
  normalizeAutoQualifyRules,
  normalizeStageLookupValue,
  evaluateSubmissionCondition,
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
