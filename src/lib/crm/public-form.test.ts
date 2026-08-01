import assert from "node:assert/strict";
import test from "node:test";
import { buildPublicFormDefinition, buildPublicFormFields } from "@/lib/crm/public-form";
import { buildDemoPublicForm } from "@/lib/crm/demo-data";
import type { FormFieldRow } from "@/lib/db/schema";

function field(overrides: Partial<FormFieldRow>): FormFieldRow {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    formId: "22222222-2222-4222-8222-222222222222",
    fieldType: "text",
    label: "Name",
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

test("public forms expose only visible, supported fields", () => {
  const visible = field({});
  const result = buildPublicFormFields([
    visible,
    field({ id: "33333333-3333-4333-8333-333333333333", isVisible: false }),
    field({ id: "44444444-4444-4444-8444-444444444444", fieldType: "file" }),
    field({ id: "55555555-5555-4555-8555-555555555555", fieldType: "unknown" }),
  ]);

  assert.deepEqual(result.map((item) => item.id), [visible.id]);
});

test("seeded demo forms expose a complete public preview without database access", () => {
  const result = buildDemoPublicForm("executive-consultation");

  assert.ok(result);
  assert.equal(result.form.status, "active");
  assert.equal(result.form.isPublic, true);
  assert.ok(result.fields.some((item) => item.mapsToLeadField === "email"));
  assert.ok(result.fields.some((item) => item.fieldType === "select"));
  assert.equal(buildDemoPublicForm("unknown-form"), null);
});

test("public form definitions retain the saved submit button label", () => {
  const result = buildDemoPublicForm("executive-consultation");

  assert.ok(result);
  assert.equal(
    buildPublicFormDefinition(result.form).submitButtonLabel,
    result.form.submitButtonLabel,
  );
  assert.equal(
    buildPublicFormDefinition({ ...result.form, presentationMode: "step" }).presentationMode,
    "step",
  );
});
