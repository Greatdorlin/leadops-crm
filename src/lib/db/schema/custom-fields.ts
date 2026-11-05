import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { customFieldTypeEnum } from "./enums";
import { leads } from "./leads";

export const customFields = pgTable(
  "custom_fields",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").notNull(),
    label: text("label").notNull(),
    type: customFieldTypeEnum("type").notNull(),
    description: text("description"),
    placeholder: text("placeholder"),
    required: boolean("required").notNull().default(false),
    archived: boolean("archived").notNull().default(false),
    showInTable: boolean("show_in_table").notNull().default(false),
    showInForm: boolean("show_in_form").notNull().default(true),
    showInDetails: boolean("show_in_details").notNull().default(true),
    searchable: boolean("searchable").notNull().default(false),
    filterable: boolean("filterable").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    keyUnique: uniqueIndex("custom_fields_key_unique").on(table.key),
    archivedIdx: index("custom_fields_archived_idx").on(table.archived),
    sortOrderIdx: index("custom_fields_sort_order_idx").on(table.sortOrder),
  }),
);

export const customFieldOptions = pgTable(
  "custom_field_options",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    customFieldId: uuid("custom_field_id")
      .notNull()
      .references(() => customFields.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    value: text("value").notNull(),
    color: text("color"),
    sortOrder: integer("sort_order").notNull().default(0),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    customFieldIdIdx: index("custom_field_options_custom_field_id_idx").on(
      table.customFieldId,
    ),
    archivedIdx: index("custom_field_options_archived_idx").on(table.archived),
  }),
);

export const leadCustomFieldValues = pgTable(
  "lead_custom_field_values",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "restrict" }),
    customFieldId: uuid("custom_field_id")
      .notNull()
      .references(() => customFields.id, { onDelete: "cascade" }),
    value: jsonb("value").$type<unknown>().notNull(),
    displayValue: text("display_value"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    leadIdIdx: index("lead_custom_field_values_lead_id_idx").on(table.leadId),
    customFieldIdIdx: index("lead_custom_field_values_custom_field_id_idx").on(
      table.customFieldId,
    ),
    leadIdCustomFieldIdUnique: uniqueIndex(
      "lead_custom_field_values_lead_field_unique",
    ).on(table.leadId, table.customFieldId),
  }),
);

export type CustomFieldRow = typeof customFields.$inferSelect;

export type CustomFieldOptionRow = typeof customFieldOptions.$inferSelect;

export type LeadCustomFieldValueRow = typeof leadCustomFieldValues.$inferSelect;
