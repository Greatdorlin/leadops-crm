import { boolean, check, date, index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { salesTargetScopeEnum, salesTargetPeriodEnum } from './enums';

export const branches = pgTable(
  "branches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    location: text("location"),
    managerUserId: uuid("manager_user_id"),
    currency: text("currency"),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    nameIdx: index("branches_name_idx").on(table.name),
    archivedIdx: index("branches_archived_idx").on(table.archived),
  }),
);

export const departments = pgTable(
  "departments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    managerUserId: uuid("manager_user_id"),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    nameIdx: index("departments_name_idx").on(table.name),
    archivedIdx: index("departments_archived_idx").on(table.archived),
  }),
);

export const teams = pgTable(
  "teams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    managerUserId: uuid("manager_user_id"),
    branchId: uuid("branch_id"),
    departmentId: uuid("department_id"),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    nameIdx: index("teams_name_idx").on(table.name),
    branchIdx: index("teams_branch_id_idx").on(table.branchId),
    departmentIdx: index("teams_department_id_idx").on(table.departmentId),
    archivedIdx: index("teams_archived_idx").on(table.archived),
  }),
);

export const leadStages = pgTable(
  "lead_stages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    key: text("key").notNull(),
    color: text("color"),
    sortOrder: integer("sort_order").notNull().default(0),
    isWon: boolean("is_won").notNull().default(false),
    isLost: boolean("is_lost").notNull().default(false),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    keyUnique: uniqueIndex("lead_stages_key_unique").on(table.key),
    sortOrderIdx: index("lead_stages_sort_order_idx").on(table.sortOrder),
    archivedIdx: index("lead_stages_archived_idx").on(table.archived),
  }),
);

export const leadSources = pgTable(
  "lead_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    key: text("key").notNull(),
    type: text("type"),
    color: text("color"),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    keyUnique: uniqueIndex("lead_sources_key_unique").on(table.key),
    typeIdx: index("lead_sources_type_idx").on(table.type),
    archivedIdx: index("lead_sources_archived_idx").on(table.archived),
  }),
);

export const workspaceAutomationRules = pgTable(
  "workspace_automation_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    conditionField: text("condition_field").notNull(),
    conditionOperator: text("condition_operator").notNull().default("equals"),
    conditionValue: text("condition_value").notNull(),
    actionType: text("action_type").notNull(),
    actionValue: text("action_value").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    activeOrderIdx: index("workspace_automation_rules_active_order_idx").on(
      table.isActive,
      table.sortOrder,
    ),
    conditionFieldIdx: index("workspace_automation_rules_condition_field_idx").on(
      table.conditionField,
    ),
    conditionOperatorCheck: check(
      "workspace_automation_rules_condition_operator_check",
      sql`${table.conditionOperator} in ('equals', 'not_equals')`,
    ),
    conditionFieldCheck: check(
      "workspace_automation_rules_condition_field_check",
      sql`${table.conditionField} in ('source', 'stage', 'priority', 'country', 'customer_type')`,
    ),
    actionTypeCheck: check(
      "workspace_automation_rules_action_type_check",
      sql`${table.actionType} in ('assign_owner', 'set_stage', 'set_priority')`,
    ),
    sortOrderCheck: check("workspace_automation_rules_sort_order_check", sql`${table.sortOrder} >= 0`),
  }),
);

export const salesTargets = pgTable(
  "sales_targets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    scope: salesTargetScopeEnum("scope").notNull(),
    scopeId: uuid("scope_id"),
    period: salesTargetPeriodEnum("period").notNull(),
    targetValue: numeric("target_value", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("USD"),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    scopeIdx: index("sales_targets_scope_idx").on(table.scope, table.scopeId),
    periodIdx: index("sales_targets_period_idx").on(table.period),
    archivedIdx: index("sales_targets_archived_idx").on(table.archived),
    activeIdx: index("sales_targets_is_active_idx").on(table.isActive),
  }),
);

export const companySettings = pgTable(
  "company_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyName: text("company_name").notNull().default("Leads Desk"),
    logoUrl: text("logo_url"),
    logoUrlLightMode: text("logo_url_light_mode"),
    logoUrlDarkMode: text("logo_url_dark_mode"),
    faviconUrl: text("favicon_url"),
    loginLogoUrl: text("login_logo_url"),
    loginLogoUrlLightMode: text("login_logo_url_light_mode"),
    loginLogoUrlDarkMode: text("login_logo_url_dark_mode"),
    primaryColor: text("primary_color").notNull().default("#1f4ed8"),
    accentColor: text("accent_color").notNull().default("#f4b400"),
    backgroundColor: text("background_color").notNull().default("#f6efe6"),
    surfaceColor: text("surface_color").notNull().default("#fffaf5"),
    cardColor: text("card_color").notNull().default("#ffffff"),
    sidebarColor: text("sidebar_color").notNull().default("#0b1438"),
    textColor: text("text_color").notNull().default("#0f172a"),
    borderColor: text("border_color").notNull().default("#d8e2f0"),
    borderRadius: integer("border_radius").notNull().default(24),
    fontScale: numeric("font_scale", { precision: 4, scale: 2 }).notNull().default("1.00"),
    fontPreset: text("font_preset").notNull().default("brand"),
    density: text("density").notNull().default("comfortable"),
    themeMode: text("theme_mode").notNull().default("light"),
    designStyle: text("design_style").notNull().default("modern"),
    glassEnabled: boolean("glass_enabled").notNull().default(false),
    glassOpacity: integer("glass_opacity").notNull().default(72),
    glassBlur: integer("glass_blur").notNull().default(18),
    celebrationsEnabled: boolean("celebrations_enabled").notNull().default(true),
    stageCelebrationsEnabled: boolean("stage_celebrations_enabled").notNull().default(true),
    targetCelebrationsEnabled: boolean("target_celebrations_enabled").notNull().default(true),
    celebrationStyle: text("celebration_style").notNull().default("balanced"),
    loginBackgroundUrl: text("login_background_url"),
    loginHeadline: text("login_headline"),
    loginSubheadline: text("login_subheadline"),
    navigationConfig: jsonb("navigation_config").$type<Record<string, unknown> | null>(),
    dashboardConfig: jsonb("dashboard_config").$type<Record<string, unknown> | null>(),
    leadPreviewConfig: jsonb("lead_preview_config").$type<Record<string, unknown> | null>(),
    industryPreset: text("industry_preset").notNull().default("general_business"),
    onboardingProfile: jsonb("onboarding_profile").$type<Record<string, unknown> | null>(),
    onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
    globalCurrency: text("global_currency").notNull().default("USD"),
    timeZone: text("time_zone"),
    defaultCountry: text("default_country"),
    defaultRegion: text("default_region"),
    defaultCity: text("default_city"),
    locale: text("locale"),
    domainRegistrationEnabled: boolean("domain_registration_enabled").notNull().default(false),
    approvedRegistrationDomains: text("approved_registration_domains")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    updatedAtIdx: index("company_settings_updated_at_idx").on(table.updatedAt),
  }),
);

export type BranchRow = typeof branches.$inferSelect;

export type DepartmentRow = typeof departments.$inferSelect;

export type TeamRow = typeof teams.$inferSelect;

export type LeadStageRow = typeof leadStages.$inferSelect;

export type LeadSourceRow = typeof leadSources.$inferSelect;

export type WorkspaceAutomationRuleRow = typeof workspaceAutomationRules.$inferSelect;

export type NewWorkspaceAutomationRuleRow = typeof workspaceAutomationRules.$inferInsert;

export type SalesTargetRow = typeof salesTargets.$inferSelect;

export type CompanySettingsRow = typeof companySettings.$inferSelect;
