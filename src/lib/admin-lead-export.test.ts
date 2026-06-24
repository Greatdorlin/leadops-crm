import assert from "node:assert/strict";
import test from "node:test";
import {
  buildExportCustomFieldColumns,
  buildLeadExportFieldOptions,
  formatCustomFieldExportValue,
} from "@/lib/admin-lead-export";

test("export includes active custom field headers with neutral labels", () => {
  const columns = buildExportCustomFieldColumns([
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
      options: [],
    },
  ]);

  assert.deepEqual(columns, [{ fieldId: "field-1", header: "Budget" }]);
});

test("export disambiguates conflicting custom field labels", () => {
  const columns = buildExportCustomFieldColumns([
    {
      id: "field-2",
      key: "source_override",
      label: "Source",
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
  ]);

  assert.deepEqual(columns, [{ fieldId: "field-2", header: "Custom: Source" }]);
});

test("export formatting prefers display values and avoids raw json output", () => {
  assert.equal(
    formatCustomFieldExportValue({
      type: "multi_select",
      value: ["urgent", "warm"],
      displayValue: "Urgent, Warm",
    }),
    "Urgent, Warm",
  );

  assert.equal(
    formatCustomFieldExportValue({
      type: "checkbox",
      value: true,
    }),
    "Yes",
  );
});

test("export field options include website answer columns", () => {
  const fields = buildLeadExportFieldOptions([]);

  assert.equal(
    fields.some((field) => field.id === "websiteAnswer:olevelCompletionYear" && field.label === "Year completed O'Level"),
    true,
  );
});
