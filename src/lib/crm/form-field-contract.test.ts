import assert from "node:assert/strict";
import test from "node:test";
import { formFieldPayloadSchema } from "@/lib/crm/form-field-contract";

const baseField = {
  fieldType: "text" as const,
  label: "Full name",
  placeholder: null,
  helpText: null,
  isRequired: true,
  isVisible: true,
  order: 0,
  options: null,
  validationRules: null,
  mapsToLeadField: "firstName",
  showWhen: null,
  defaultValue: null,
};

test("form field contracts allow core and custom lead mappings", () => {
  assert.equal(formFieldPayloadSchema.safeParse(baseField).success, true);
  assert.equal(
    formFieldPayloadSchema.safeParse({
      ...baseField,
      mapsToLeadField: "customField_11111111-1111-4111-8111-111111111111",
    }).success,
    true,
  );
});

test("form field contracts reject unsupported uploads and invalid options", () => {
  assert.equal(
    formFieldPayloadSchema.safeParse({ ...baseField, fieldType: "file" }).success,
    false,
  );
  assert.equal(
    formFieldPayloadSchema.safeParse({
      ...baseField,
      fieldType: "select",
      options: [
        { label: "One", value: "same" },
        { label: "Two", value: "same" },
      ],
    }).success,
    false,
  );
});
