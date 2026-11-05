import { boolean, check, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { leads } from './leads';

export const forms = pgTable(
  "forms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: text("workspace_id").notNull().default("default"),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    status: text("status").notNull().default("draft"),
    isActive: boolean("is_active").notNull().default(true),
    isPublic: boolean("is_public").notNull().default(true),
    successMessage: text("success_message").notNull().default("Thank you for your submission."),
    submitButtonLabel: text("submit_button_label").notNull().default("Submit"),
    presentationMode: text("presentation_mode").notNull().default("standard"),
    redirectUrl: text("redirect_url"),
    primaryColor: text("primary_color"),
    accentColor: text("accent_color"),
    logoUrl: text("logo_url"),
    enableAutoQualify: boolean("enable_auto_qualify").notNull().default(false),
    autoQualifyRules: jsonb("auto_qualify_rules").$type<Record<string, unknown>[] | null>(),
    defaultStatus: text("default_status").notNull().default("new"),
    defaultPriority: text("default_priority").notNull().default("medium"),
    defaultSource: text("default_source").notNull().default("website_form"),
    defaultOwnerId: text("default_owner_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdIdx: index("forms_workspace_id_idx").on(table.workspaceId),
    slugIdx: index("forms_slug_idx").on(table.slug),
    statusIdx: index("forms_status_idx").on(table.status),
    slugWorkspaceUnique: uniqueIndex("forms_slug_workspace_unique").on(table.slug, table.workspaceId),
    statusCheck: check(
      "forms_status_check",
      sql`${table.status} in ('draft', 'active', 'archived')`,
    ),
    presentationModeCheck: check(
      "forms_presentation_mode_check",
      sql`${table.presentationMode} in ('standard', 'step')`,
    ),
  }),
);

export const formFields = pgTable(
  "form_fields",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    fieldType: text("field_type").notNull(),
    label: text("label").notNull(),
    placeholder: text("placeholder"),
    helpText: text("help_text"),
    isRequired: boolean("is_required").notNull().default(false),
    isVisible: boolean("is_visible").notNull().default(true),
    order: integer("order").notNull().default(0),
    options: jsonb("options").$type<{ label: string; value: string }[] | null>(),
    validationRules: jsonb("validation_rules").$type<Record<string, unknown> | null>(),
    mapsToLeadField: text("maps_to_lead_field"),
    showWhen: jsonb("show_when").$type<Record<string, unknown> | null>(),
    defaultValue: text("default_value"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    formIdIdx: index("form_fields_form_id_idx").on(table.formId),
    formIdOrderIdx: index("form_fields_order_idx").on(table.formId, table.order),
    orderCheck: check("form_fields_order_check", sql`${table.order} >= 0`),
  }),
);

export const formRules = pgTable(
  "form_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    conditionFieldId: uuid("condition_field_id")
      .notNull()
      .references(() => formFields.id, { onDelete: "cascade" }),
    conditionOperator: text("condition_operator").notNull().default("equals"),
    conditionValue: text("condition_value"),
    actionType: text("action_type").notNull(),
    actionTarget: text("action_target"),
    actionValue: text("action_value"),
    isActive: boolean("is_active").notNull().default(true),
    order: integer("order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    formIdIdx: index("form_rules_form_id_idx").on(table.formId),
    formIdOrderIdx: index("form_rules_order_idx").on(table.formId, table.order),
    orderCheck: check("form_rules_order_check", sql`${table.order} >= 0`),
  }),
);

export const formSubmissions = pgTable(
  "form_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id")
      .references(() => leads.id, { onDelete: "set null" }),
    data: jsonb("data").$type<Record<string, unknown>>().notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    referrer: text("referrer"),
    status: text("status").notNull().default("pending"),
    appliedRules: jsonb("applied_rules").$type<Record<string, unknown>[] | null>(),
    createdLeadId: uuid("created_lead_id").references(() => leads.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    formIdIdx: index("form_submissions_form_id_idx").on(table.formId),
    leadIdIdx: index("form_submissions_lead_id_idx").on(table.leadId),
    statusIdx: index("form_submissions_status_idx").on(table.status),
    createdAtIdx: index("form_submissions_created_at_idx").on(table.createdAt),
    formIdCreatedAtIdIdx: index("form_submissions_form_created_id_idx").on(
      table.formId,
      table.createdAt,
      table.id,
    ),
  }),
);

export type FormRow = typeof forms.$inferSelect;

export type NewFormRow = typeof forms.$inferInsert;

export type FormFieldRow = typeof formFields.$inferSelect;

export type NewFormFieldRow = typeof formFields.$inferInsert;

export type FormRuleRow = typeof formRules.$inferSelect;

export type NewFormRuleRow = typeof formRules.$inferInsert;

export type FormSubmissionRow = typeof formSubmissions.$inferSelect;

export type NewFormSubmissionRow = typeof formSubmissions.$inferInsert;
