import assert from "node:assert/strict";
import test from "node:test";
import { canManageCustomFields } from "@/lib/crm/authz";
import {
  adminCustomFieldSchema,
  buildCustomFieldOptionOperations,
  filterVisibleCustomFields,
  generateCustomFieldKey,
} from "@/lib/crm/custom-fields-admin";
import { CUSTOM_FIELD_TYPES, type CustomFieldOption } from "@/lib/crm/domain";

test("custom field key generation creates machine-safe keys", () => {
  assert.equal(generateCustomFieldKey("Preferred Contact Time"), "preferred_contact_time");
  assert.equal(generateCustomFieldKey("  Budget (NGN) "), "budget_ngn");
});

test("custom field validation allows all configured field types", () => {
  for (const type of CUSTOM_FIELD_TYPES) {
    const parsed = adminCustomFieldSchema.safeParse({
      label: "Test Field",
      type,
      options:
        type === "select" || type === "multi_select"
          ? [{ label: "Option A", value: "option_a" }]
          : [],
    });

    assert.equal(parsed.success, true);
  }
});

test("select and multi-select fields require at least one active option", () => {
  const parsed = adminCustomFieldSchema.safeParse({
    label: "Urgency",
    type: "select",
    options: [],
  });

  assert.equal(parsed.success, false);
});

test("option operations archive removed options instead of hard deleting them", () => {
  const existingOptions: CustomFieldOption[] = [
    {
      id: "option-1",
      customFieldId: "field-1",
      label: "Warm",
      value: "warm",
      color: null,
      sortOrder: 0,
      archived: false,
    },
    {
      id: "option-2",
      customFieldId: "field-1",
      label: "Cold",
      value: "cold",
      color: null,
      sortOrder: 1,
      archived: false,
    },
  ];

  const operations = buildCustomFieldOptionOperations(existingOptions, [
    { id: "option-1", label: "Warm", value: "warm" },
    { label: "Hot", value: "hot" },
  ]);

  assert.equal(operations.toCreate.length, 1);
  assert.equal(operations.toArchive.length, 1);
  assert.equal(operations.toArchive[0].id, "option-2");
});

test("archived fields are hidden by default", () => {
  const fields = filterVisibleCustomFields([
    { id: "field-1", archived: false },
    { id: "field-2", archived: true },
  ]);

  assert.equal(fields.length, 1);
  assert.equal(fields[0].id, "field-1");
});

test("owner and admin can manage custom fields, sales reps cannot", () => {
  assert.equal(
    canManageCustomFields({ accessLevel: "master_admin", email: "owner@example.com", role: "admin" }),
    true,
  );
  assert.equal(
    canManageCustomFields({ accessLevel: "general_admin", email: "admin@example.com", role: "manager" }),
    true,
  );
  assert.equal(
    canManageCustomFields({ accessLevel: "sales_rep", email: "rep@example.com", role: "sales_agent" }),
    false,
  );
});
