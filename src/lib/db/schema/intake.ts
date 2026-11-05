import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { LeadPriority } from "@/lib/crm/types";
import {
  leadPriorityEnum,
  formSourceTypeEnum,
  formFieldTargetTypeEnum,
  formFieldCoreTargetEnum,
  leadIntakeEventStatusEnum,
} from "./enums";
import { leads } from "./leads";
import { customFields } from "./custom-fields";

export const formSources = pgTable(
  "form_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    type: formSourceTypeEnum("type").notNull(),
    sourceId: text("source_id"),
    webhookKey: text("webhook_key"),
    isActive: boolean("is_active").notNull().default(true),
    defaultStageId: uuid("default_stage_id"),
    defaultAssignedUserId: uuid("default_assigned_user_id"),
    defaultTeamId: uuid("default_team_id"),
    defaultBranchId: uuid("default_branch_id"),
    defaultDepartmentId: uuid("default_department_id"),
    defaultPriority: leadPriorityEnum("default_priority").$type<LeadPriority>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    typeIdx: index("form_sources_type_idx").on(table.type),
    webhookKeyUnique: uniqueIndex("form_sources_webhook_key_unique").on(
      table.webhookKey,
    ),
    isActiveIdx: index("form_sources_is_active_idx").on(table.isActive),
  }),
);

export const formFieldMappings = pgTable(
  "form_field_mappings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    formSourceId: uuid("form_source_id")
      .notNull()
      .references(() => formSources.id, { onDelete: "cascade" }),
    externalFieldName: text("external_field_name").notNull(),
    externalFieldLabel: text("external_field_label"),
    targetType: formFieldTargetTypeEnum("target_type").notNull(),
    targetField: formFieldCoreTargetEnum("target_field"),
    customFieldId: uuid("custom_field_id").references(() => customFields.id, {
      onDelete: "set null",
    }),
    required: boolean("required").notNull().default(false),
    transformRule: text("transform_rule"),
    fallbackValue: text("fallback_value"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    formSourceIdIdx: index("form_field_mappings_form_source_id_idx").on(
      table.formSourceId,
    ),
    customFieldIdIdx: index("form_field_mappings_custom_field_id_idx").on(
      table.customFieldId,
    ),
  }),
);

export const leadIntakeEvents = pgTable(
  "lead_intake_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    formSourceId: uuid("form_source_id").references(() => formSources.id, {
      onDelete: "set null",
    }),
    leadId: uuid("lead_id").references(() => leads.id, {
      onDelete: "set null",
    }),
    rawPayload: jsonb("raw_payload")
      .$type<Record<string, unknown> | null>()
      .notNull(),
    normalizedPayload: jsonb("normalized_payload").$type<Record<
      string,
      unknown
    > | null>(),
    status: leadIntakeEventStatusEnum("status").notNull(),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    formSourceIdIdx: index("lead_intake_events_form_source_id_idx").on(
      table.formSourceId,
    ),
    leadIdIdx: index("lead_intake_events_lead_id_idx").on(table.leadId),
    statusIdx: index("lead_intake_events_status_idx").on(table.status),
    createdAtIdx: index("lead_intake_events_created_at_idx").on(
      table.createdAt,
    ),
  }),
);

export type FormSourceRow = typeof formSources.$inferSelect;

export type FormFieldMappingRow = typeof formFieldMappings.$inferSelect;

export type LeadIntakeEventRow = typeof leadIntakeEvents.$inferSelect;
