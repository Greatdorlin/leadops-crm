import assert from "node:assert/strict";
import test from "node:test";
import { validateFormSubmissionData } from "@/lib/crm/form-submission-validation";
import type { FormFieldRow } from "@/lib/db/schema";

function field(overrides: Partial<FormFieldRow> = {}): FormFieldRow {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    formId: "22222222-2222-4222-8222-222222222222",
    fieldType: "text",
    label: "Answer",
    placeholder: null,
    helpText: null,
    isRequired: false,
    isVisible: true,
    order: 0,
    options: null,
    validationRules: null,
    mapsToLeadField: null,
    showWhen: null,
    defaultValue: null,
    createdAt: new Date("2026-07-11T00:00:00.000Z"),
    updatedAt: new Date("2026-07-11T00:00:00.000Z"),
    ...overrides,
  };
}

test("submission validation keeps safe values and drops unknown fields", () => {
  const textField = field({ isRequired: true });
  const result = validateFormSubmissionData([textField], {
    [textField.id]: " - ",
    unknown: "do not store me",
  });

  assert.equal(result.success, true);
  assert.deepEqual(result.data, { [textField.id]: "-" });
});

test("hidden conditional fields are not treated as missing", () => {
  const controller = field({ id: "33333333-3333-4333-8333-333333333333" });
  const conditional = field({
    id: "44444444-4444-4444-8444-444444444444",
    isRequired: true,
    showWhen: { fieldId: controller.id, operator: "equals", value: "yes" },
  });
  const result = validateFormSubmissionData([controller, conditional], {
    [controller.id]: "no",
  });

  assert.equal(result.success, true);
  assert.equal(result.fieldErrors[conditional.id], undefined);
});

test("submission validation rejects invalid options, numbers, and file fields", () => {
  const select = field({
    id: "55555555-5555-4555-8555-555555555555",
    fieldType: "select",
    options: [{ label: "Yes", value: "yes" }],
  });
  const number = field({
    id: "66666666-6666-4666-8666-666666666666",
    fieldType: "number",
    validationRules: { min: 10 },
  });
  const file = field({
    id: "77777777-7777-4777-8777-777777777777",
    fieldType: "file",
  });
  const result = validateFormSubmissionData([select, number, file], {
    [select.id]: "maybe",
    [number.id]: 2,
    [file.id]: {},
  });

  assert.equal(result.success, false);
  assert.equal(Object.keys(result.fieldErrors).length, 3);
});
