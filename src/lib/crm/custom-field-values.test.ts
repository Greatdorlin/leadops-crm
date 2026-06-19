import assert from "node:assert/strict";
import test from "node:test";
import type { CustomFieldDefinitionWithOptions } from "@/lib/crm/custom-field-values";
import {
  buildLeadTableCustomFieldColumns,
  buildCustomFieldInputModel,
  formatCustomFieldDisplayValue,
  getTableVisibleCustomFields,
  serializeCustomFieldValue,
  validateCustomFieldValues,
} from "@/lib/crm/custom-field-values";

const fieldDefinitions: CustomFieldDefinitionWithOptions[] = [
  {
    id: "field-budget",
    key: "budget",
    label: "Budget",
    type: "currency",
    description: null,
    placeholder: null,
    required: true,
    archived: false,
    showInTable: true,
    showInForm: true,
    showInDetails: true,
    searchable: true,
    filterable: true,
    sortOrder: 0,
    createdAt: "2026-06-18T00:00:00.000Z",
    updatedAt: "2026-06-18T00:00:00.000Z",
    options: [],
  },
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
    sortOrder: 1,
    createdAt: "2026-06-18T00:00:00.000Z",
    updatedAt: "2026-06-18T00:00:00.000Z",
    options: [
      {
        id: "option-a",
        customFieldId: "field-interest",
        label: "Training",
        value: "training",
        color: null,
        sortOrder: 0,
        archived: false,
      },
    ],
  },
  {
    id: "field-tags",
    key: "tags",
    label: "Tags",
    type: "multi_select",
    description: null,
    placeholder: null,
    required: false,
    archived: false,
    showInTable: false,
    showInForm: true,
    showInDetails: true,
    searchable: false,
    filterable: true,
    sortOrder: 2,
    createdAt: "2026-06-18T00:00:00.000Z",
    updatedAt: "2026-06-18T00:00:00.000Z",
    options: [
      {
        id: "option-b",
        customFieldId: "field-tags",
        label: "Urgent",
        value: "urgent",
        color: null,
        sortOrder: 0,
        archived: false,
      },
      {
        id: "option-c",
        customFieldId: "field-tags",
        label: "Warm",
        value: "warm",
        color: null,
        sortOrder: 1,
        archived: false,
      },
    ],
  },
  {
    id: "field-legacy",
    key: "legacy",
    label: "Legacy",
    type: "text",
    description: null,
    placeholder: null,
    required: false,
    archived: true,
    showInTable: false,
    showInForm: true,
    showInDetails: true,
    searchable: false,
    filterable: false,
    sortOrder: 3,
    createdAt: "2026-06-18T00:00:00.000Z",
    updatedAt: "2026-06-18T00:00:00.000Z",
    options: [],
  },
];

test("custom field value validation checks field types and required values", () => {
  const valid = validateCustomFieldValues(fieldDefinitions, {
    "field-budget": "250000",
    "field-interest": "training",
    "field-tags": ["urgent", "warm"],
  });

  assert.equal(valid.success, true);
  assert.equal(valid.values[0].value, 250000);
  assert.equal(valid.values[0].displayValue, "250,000");

  const invalid = validateCustomFieldValues(fieldDefinitions, {
    "field-budget": "",
    "field-interest": "not-real",
  });

  assert.equal(invalid.success, false);
  assert.equal(invalid.fieldErrors["field-budget"], "Budget is required.");
  assert.equal(invalid.fieldErrors["field-interest"], "Interest must use one of the available options.");
});

test("serialization and display formatting cover common field types", () => {
  assert.equal(serializeCustomFieldValue("checkbox", "true"), true);
  assert.equal(serializeCustomFieldValue("date", "2026-06-18"), "2026-06-18");
  assert.deepEqual(serializeCustomFieldValue("multi_select", ["urgent", "warm"]), ["urgent", "warm"]);
  assert.equal(formatCustomFieldDisplayValue("datetime", "2026-06-18T09:30"), "2026-06-18 09:30");
  assert.equal(formatCustomFieldDisplayValue("checkbox", false), "No");
});

test("buildCustomFieldInputModel hides archived fields from normal input", () => {
  const model = buildCustomFieldInputModel(fieldDefinitions, [
    { customFieldId: "field-budget", value: 150000 },
    { customFieldId: "field-legacy", value: "hidden" },
  ]);

  assert.equal(model.length, 3);
  assert.equal(model.some((field) => field.fieldId === "field-legacy"), false);
  assert.equal(model[0].value, 150000);
});

test("showInTable fields stay visible for table usage and archived fields stay hidden", () => {
  const visible = getTableVisibleCustomFields(fieldDefinitions, { limit: 3 });

  assert.equal(visible.length, 1);
  assert.equal(visible[0].id, "field-budget");

  const columns = buildLeadTableCustomFieldColumns([
    {
      customFieldDisplayValues: [
        {
          fieldId: "field-budget",
          key: "budget",
          label: "Budget",
          showInTable: true,
        },
        {
          fieldId: "field-interest",
          key: "interest",
          label: "Interest",
          showInTable: false,
        },
      ],
    },
  ]);

  assert.deepEqual(columns, [
    {
      fieldId: "field-budget",
      key: "budget",
      label: "Budget",
    },
  ]);
});
