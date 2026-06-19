import assert from "node:assert/strict";
import test from "node:test";
import type { CustomFieldDefinition } from "@/lib/crm/domain";
import {
  buildCustomFieldDisplayValues,
  resolveLeadSourceDisplay,
  resolveLeadStageDisplay,
} from "@/lib/crm/read-adapters";

test("dual-read stage helper prefers normalized stage over legacy fallback", () => {
  const display = resolveLeadStageDisplay(
    { crmStatus: "converted", source: "manual_entry", assignedTo: null, stageId: "stage-1" },
    { id: "stage-1", key: "qualified", name: "Qualified", color: "#7c3aed" },
  );

  assert.equal(display.label, "Qualified");
  assert.equal(display.isNormalized, true);
});

test("dual-read source helper prefers normalized source over legacy fallback", () => {
  const display = resolveLeadSourceDisplay(
    { crmStatus: "new", source: "website_form", assignedTo: null, sourceId: "source-1" },
    { id: "source-1", key: "referral", name: "Referral", type: "referral", color: "#16a34a" },
  );

  assert.equal(display.label, "Referral");
  assert.equal(display.isNormalized, true);
});

test("custom field display helper builds stable display values and hides archived fields by default", () => {
  const definitions: CustomFieldDefinition[] = [
    {
      id: "field-1",
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
    },
    {
      id: "field-2",
      key: "legacy_field",
      label: "Legacy Field",
      type: "text",
      description: null,
      placeholder: null,
      required: false,
      archived: true,
      showInTable: false,
      showInForm: false,
      showInDetails: true,
      searchable: false,
      filterable: false,
      sortOrder: 1,
      createdAt: "2026-06-18T00:00:00.000Z",
      updatedAt: "2026-06-18T00:00:00.000Z",
    },
  ];

  const display = buildCustomFieldDisplayValues(definitions, [
    { customFieldId: "field-1", value: 250000, displayValue: "250,000" },
    { customFieldId: "field-2", value: "hidden", displayValue: "Hidden" },
  ]);

  assert.equal(display.length, 1);
  assert.equal(display[0].label, "Budget");
  assert.equal(display[0].displayValue, "250,000");
});
