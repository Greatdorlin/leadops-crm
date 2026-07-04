import assert from "node:assert/strict";
import test from "node:test";
import type { CustomFieldDefinitionWithOptions } from "./custom-field-values";
import { parseCsvText, parseLeadImportCsv, resolveCustomFieldHeaderMatch } from "./csv";

test("parseCsvText keeps quoted commas and line breaks intact", () => {
  const rows = parseCsvText(
    [
      "first_name,email,notes",
      "\"Ada\",ada@example.com,\"Needs pricing review, follows up next week\"",
      "\"Grace\",grace@example.com,\"Line one",
      "line two\"",
    ].join("\n"),
  );

  assert.deepEqual(rows, [
    ["first_name", "email", "notes"],
    ["Ada", "ada@example.com", "Needs pricing review, follows up next week"],
    ["Grace", "grace@example.com", "Line one\nline two"],
  ]);
});

test("parseLeadImportCsv maps common lead headers into CRM rows", () => {
  const rows = parseLeadImportCsv(
    [
      "Full Name,Email Address,Phone,Stage,Priority,Owner,Source,Category,Notes",
      "Ada Lovelace,ada@example.com,+2348012345678,consultation booked,high,rep@example.com,website form,enterprise buyer,Requested fast callback",
    ].join("\n"),
  );

  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    rowNumber: 2,
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    whatsappNumber: "+2348012345678",
    state: null,
    category: "enterprise buyer",
    stage: "consultation_booked",
    priority: "high",
    assignedTo: "rep@example.com",
    source: "website_form",
    sourceDetail: "Requested fast callback",
  });
});

test("csv import maps matching custom field labels and keys", () => {
  const rows = parseLeadImportCsv(
    [
      "Full Name,Email Address,Budget,interest_level",
      "Ada Lovelace,ada@example.com,250000,urgent",
    ].join("\n"),
    {
      customFieldDefinitions: [
        {
          id: "field-budget",
          key: "budget",
          label: "Budget",
          type: "currency",
          description: null,
          placeholder: null,
          required: false,
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
          key: "interest_level",
          label: "Interest Level",
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
          options: [],
        },
      ],
    },
  );

  assert.deepEqual(rows[0].customFieldValues, {
    "field-budget": "250000",
    "field-interest": "urgent",
  });
});

test("custom field header matching prefers label or key aliases", () => {
  const definitions: CustomFieldDefinitionWithOptions[] = [
    {
      id: "field-1",
      key: "property_type",
      label: "Property Type",
      type: "text",
      description: null,
      placeholder: null,
      required: false,
      archived: false,
      showInTable: false,
      showInForm: true,
      showInDetails: true,
      searchable: false,
      filterable: false,
      sortOrder: 0,
      createdAt: "2026-06-18T00:00:00.000Z",
      updatedAt: "2026-06-18T00:00:00.000Z",
      options: [],
    },
  ];

  assert.equal(resolveCustomFieldHeaderMatch("Property Type", definitions)?.id, "field-1");
  assert.equal(resolveCustomFieldHeaderMatch("property_type", definitions)?.id, "field-1");
});
