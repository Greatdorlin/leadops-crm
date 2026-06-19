import assert from "node:assert/strict";
import test from "node:test";
import { canManageFormSources } from "@/lib/crm/authz";
import {
  adminFormFieldMappingsSchema,
  adminFormSourceSchema,
  filterSelectableCustomMappingFields,
  normalizeAdminFormFieldMappingsPayload,
} from "@/lib/crm/form-sources-admin";
import { FORM_FIELD_CORE_TARGETS, FORM_SOURCE_TYPES } from "@/lib/crm/domain";

test("form source validation allows all configured source types", () => {
  for (const type of FORM_SOURCE_TYPES) {
    const parsed = adminFormSourceSchema.safeParse({
      name: "Source",
      type,
    });

    assert.equal(parsed.success, true);
  }
});

test("field mapping validation allows safe core targets", () => {
  for (const targetField of FORM_FIELD_CORE_TARGETS) {
    const parsed = adminFormFieldMappingsSchema.safeParse([
      {
        externalFieldName: "full_name",
        targetType: "core",
        targetField,
      },
    ]);

    assert.equal(parsed.success, true);
  }
});

test("field mapping validation requires custom field id for custom targets", () => {
  const parsed = adminFormFieldMappingsSchema.safeParse([
    {
      externalFieldName: "budget",
      targetType: "custom",
    },
  ]);

  assert.equal(parsed.success, false);
});

test("duplicate external field names are rejected per source", () => {
  const parsed = normalizeAdminFormFieldMappingsPayload([
    { externalFieldName: "budget", targetType: "core", targetField: "estimatedValue" },
    { externalFieldName: "Budget", targetType: "custom", customFieldId: "field-1" },
  ]);

  assert.equal(parsed.success, false);
});

test("archived custom fields are hidden from selectable mapping targets by default", () => {
  const visibleFields = filterSelectableCustomMappingFields([
    { id: "field-1", archived: false },
    { id: "field-2", archived: true },
  ]);

  assert.deepEqual(visibleFields, [{ id: "field-1", archived: false }]);
});

test("owner and admin can manage form sources, sales reps cannot", () => {
  assert.equal(
    canManageFormSources({ accessLevel: "master_admin", email: "owner@example.com", role: "admin" }),
    true,
  );
  assert.equal(
    canManageFormSources({ accessLevel: "general_admin", email: "admin@example.com", role: "manager" }),
    true,
  );
  assert.equal(
    canManageFormSources({ accessLevel: "sales_rep", email: "rep@example.com", role: "sales_agent" }),
    false,
  );
});
