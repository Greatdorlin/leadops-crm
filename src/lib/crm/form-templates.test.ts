import assert from "node:assert/strict";
import test from "node:test";
import { FORM_TEMPLATES, getFormTemplateByKey } from "@/lib/crm/form-templates";
import { formFieldPayloadSchema } from "@/lib/crm/form-field-contract";

test("starter templates capture first and last names separately", () => {
  for (const template of FORM_TEMPLATES.filter((item) => item.key !== "blank")) {
    const firstName = template.fields.find((field) => field.mapsToLeadField === "firstName");
    const lastName = template.fields.find((field) => field.mapsToLeadField === "lastName");

    assert.equal(firstName?.label, "First name", `${template.key} needs a first-name field`);
    assert.equal(lastName?.label, "Last name", `${template.key} needs a last-name field`);
    assert.equal(firstName?.isRequired, true);
    assert.equal(lastName?.isRequired, true);
    assert.equal(
      template.fields.some((field) => field.label.toLowerCase() === "full name"),
      false,
    );

    for (const [order, field] of template.fields.entries()) {
      const result = formFieldPayloadSchema.safeParse({
        ...field,
        order,
        isRequired: field.isRequired === true,
        isVisible: true,
        placeholder: field.placeholder ?? null,
        helpText: field.helpText ?? null,
        mapsToLeadField: field.mapsToLeadField ?? null,
        options: field.options ?? null,
        validationRules: null,
        showWhen: null,
        defaultValue: field.defaultValue ?? null,
      });
      assert.equal(result.success, true, `${template.key}/${field.label} must be accepted by the form API`);
    }
  }
});

test("the default sales form starts with separate identity fields", () => {
  const template = getFormTemplateByKey("sales_inquiry");

  assert.deepEqual(
    template.fields.slice(0, 2).map((field) => ({
      label: field.label,
      mapsToLeadField: field.mapsToLeadField,
    })),
    [
      { label: "First name", mapsToLeadField: "firstName" },
      { label: "Last name", mapsToLeadField: "lastName" },
    ],
  );
});

test("stored full-name fields remain valid without being rewritten", () => {
  const legacyField = {
    fieldType: "text" as const,
    label: "Full name",
    placeholder: "Ada Okafor",
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

  assert.equal(formFieldPayloadSchema.safeParse(legacyField).success, true);
});
