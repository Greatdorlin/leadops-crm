import assert from "node:assert/strict";
import test from "node:test";
import type { CustomFieldDefinitionWithOptions } from "@/lib/crm/custom-field-values";
import {
  buildSamplePayloadFromMappings,
  generateWebhookKey,
  mapWebhookPayloadWithMappings,
} from "@/lib/crm/intake-runtime";

const customFields: CustomFieldDefinitionWithOptions[] = [
  {
    id: "field-interest",
    key: "interest",
    label: "Interest",
    type: "select",
    description: null,
    placeholder: null,
    required: false,
    archived: false,
    showInTable: false,
    showInForm: true,
    showInDetails: true,
    searchable: false,
    filterable: true,
    sortOrder: 0,
    createdAt: "2026-06-18T00:00:00.000Z",
    updatedAt: "2026-06-18T00:00:00.000Z",
    options: [
      {
        id: "option-training",
        customFieldId: "field-interest",
        label: "Training",
        value: "training",
        color: null,
        sortOrder: 0,
        archived: false,
      },
    ],
  },
];

test("webhook mapping resolves core fields, custom fields, and fallback values", () => {
  const result = mapWebhookPayloadWithMappings({
    payload: {
      full_name: "Ada Okafor",
      email_address: "ada@example.com",
      campaign_name: "June Push",
      interest_pick: "training",
    },
    mappings: [
      {
        id: "mapping-name",
        formSourceId: "source-1",
        externalFieldName: "full_name",
        externalFieldLabel: "Full Name",
        targetType: "core",
        targetField: "name",
        customFieldId: null,
        required: true,
        transformRule: null,
        fallbackValue: null,
        createdAt: new Date("2026-06-18T00:00:00.000Z"),
        updatedAt: new Date("2026-06-18T00:00:00.000Z"),
      },
      {
        id: "mapping-email",
        formSourceId: "source-1",
        externalFieldName: "email_address",
        externalFieldLabel: "Email",
        targetType: "core",
        targetField: "email",
        customFieldId: null,
        required: true,
        transformRule: null,
        fallbackValue: null,
        createdAt: new Date("2026-06-18T00:00:00.000Z"),
        updatedAt: new Date("2026-06-18T00:00:00.000Z"),
      },
      {
        id: "mapping-source",
        formSourceId: "source-1",
        externalFieldName: "source_name",
        externalFieldLabel: "Source",
        targetType: "core",
        targetField: "sourceId",
        customFieldId: null,
        required: false,
        transformRule: null,
        fallbackValue: "website",
        createdAt: new Date("2026-06-18T00:00:00.000Z"),
        updatedAt: new Date("2026-06-18T00:00:00.000Z"),
      },
      {
        id: "mapping-interest",
        formSourceId: "source-1",
        externalFieldName: "interest_pick",
        externalFieldLabel: "Interest",
        targetType: "custom",
        targetField: null,
        customFieldId: "field-interest",
        required: false,
        transformRule: null,
        fallbackValue: null,
        createdAt: new Date("2026-06-18T00:00:00.000Z"),
        updatedAt: new Date("2026-06-18T00:00:00.000Z"),
      },
      {
        id: "mapping-campaign",
        formSourceId: "source-1",
        externalFieldName: "campaign_name",
        externalFieldLabel: "Campaign",
        targetType: "core",
        targetField: "campaignLabel",
        customFieldId: null,
        required: false,
        transformRule: null,
        fallbackValue: null,
        createdAt: new Date("2026-06-18T00:00:00.000Z"),
        updatedAt: new Date("2026-06-18T00:00:00.000Z"),
      },
    ],
    customFields,
  });

  assert.deepEqual(result.errors, []);
  assert.equal(result.coreFields.name, "Ada Okafor");
  assert.equal(result.coreFields.email, "ada@example.com");
  assert.equal(result.coreFields.sourceId, "website");
  assert.equal(result.coreFields.campaignLabel, "June Push");
  assert.equal(result.customFieldValues.length, 1);
  assert.equal(result.customFieldValues[0]?.customFieldId, "field-interest");
  assert.equal(result.customFieldValues[0]?.displayValue, "training");
});

test("webhook mapping reports required and invalid custom-field values instead of guessing", () => {
  const result = mapWebhookPayloadWithMappings({
    payload: {
      interest_pick: "unknown-choice",
    },
    mappings: [
      {
        id: "mapping-name",
        formSourceId: "source-1",
        externalFieldName: "full_name",
        externalFieldLabel: "Full Name",
        targetType: "core",
        targetField: "name",
        customFieldId: null,
        required: true,
        transformRule: null,
        fallbackValue: null,
        createdAt: new Date("2026-06-18T00:00:00.000Z"),
        updatedAt: new Date("2026-06-18T00:00:00.000Z"),
      },
      {
        id: "mapping-interest",
        formSourceId: "source-1",
        externalFieldName: "interest_pick",
        externalFieldLabel: "Interest",
        targetType: "custom",
        targetField: null,
        customFieldId: "field-interest",
        required: false,
        transformRule: null,
        fallbackValue: null,
        createdAt: new Date("2026-06-18T00:00:00.000Z"),
        updatedAt: new Date("2026-06-18T00:00:00.000Z"),
      },
    ],
    customFields,
  });

  assert.equal(result.errors.includes("Full Name is required."), true);
  assert.equal(
    result.errors.includes("Interest must use one of the available options."),
    true,
  );
});

test("webhook helper utilities generate stable preview values for setup", () => {
  const key = generateWebhookKey("Website Contact Form");
  assert.match(key, /^website_contact_form_[a-z0-9]{6}$/);

  const sample = buildSamplePayloadFromMappings([
    {
      externalFieldName: "full_name",
      externalFieldLabel: "Full Name",
      targetType: "core",
      targetField: "name",
    },
    {
      externalFieldName: "preferred_service",
      externalFieldLabel: "Preferred Service",
      targetType: "custom",
      targetField: null,
    },
  ]);

  assert.equal(sample.full_name, "Ada Okafor");
  assert.equal(sample.preferred_service, "Preferred Service");
});
