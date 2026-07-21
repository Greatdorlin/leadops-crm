import assert from "node:assert/strict";
import test from "node:test";
import {
  formCreatePayloadSchema,
  formSettingsPayloadSchema,
  resolveFormAvailability,
} from "@/lib/crm/form-settings-contract";

const validSettings = {
  name: "Qualified enquiry",
  slug: "qualified-enquiry",
  description: null,
  status: "active" as const,
  isActive: true,
  isPublic: true,
  successMessage: "Thanks. We will be in touch.",
  redirectUrl: null,
  primaryColor: "#0f766e",
  accentColor: "#f59e0b",
  logoUrl: "/brand/logo.png",
  enableAutoQualify: true,
  autoQualifyRules: [
    {
      fieldId: "11111111-1111-4111-8111-111111111111",
      operator: "equals" as const,
      value: "-",
      stageKey: "qualified",
    },
  ],
  defaultStatus: "new",
  defaultPriority: "medium" as const,
  defaultSource: "website_form" as const,
  defaultOwnerId: null,
};

test("form settings accept a complete qualification contract", () => {
  assert.equal(formSettingsPayloadSchema.safeParse(validSettings).success, true);
});

test("form settings reject malformed automation and unsafe presentation values", () => {
  assert.equal(
    formSettingsPayloadSchema.safeParse({
      ...validSettings,
      autoQualifyRules: [{ ...validSettings.autoQualifyRules[0], fieldId: "not-a-field-id" }],
    }).success,
    false,
  );
  assert.equal(
    formSettingsPayloadSchema.safeParse({ ...validSettings, slug: "Not A Safe Slug" }).success,
    false,
  );
  assert.equal(
    formSettingsPayloadSchema.safeParse({ ...validSettings, logoUrl: "//untrusted.example/logo.png" }).success,
    false,
  );
  assert.equal(
    formSettingsPayloadSchema.safeParse({ ...validSettings, logoUrl: "javascript:alert(1)" }).success,
    false,
  );
  assert.equal(
    formSettingsPayloadSchema.safeParse({
      ...validSettings,
      redirectUrl: "data:image/png;base64,aGVsbG8=",
    }).success,
    false,
  );
});

test("form creation validates starter fields as one request", () => {
  const parsed = formCreatePayloadSchema.safeParse({
    name: "Quote request",
    slug: "quote-request",
    defaultStatus: "new",
    fields: [
      {
        fieldType: "text",
        label: "First name",
        isRequired: true,
        isVisible: true,
        order: 0,
        mapsToLeadField: "firstName",
      },
    ],
  });
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.fields.length, 1);
});

test("form status cannot drift from response availability", () => {
  assert.deepEqual(resolveFormAvailability("active", true), {
    isActive: true,
    isPublic: true,
  });
  assert.deepEqual(resolveFormAvailability("draft", true), {
    isActive: false,
    isPublic: true,
  });
  assert.deepEqual(resolveFormAvailability("archived", true), {
    isActive: false,
    isPublic: false,
  });
});
