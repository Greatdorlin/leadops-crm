import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  CRM_USER_ROLES,
  INTEGRATION_PROVIDERS,
  INTEGRATION_STATUSES,
  LEAD_PRIORITIES,
  SOURCE_PAYLOAD_PROCESSING_STATUSES,
  SYNC_JOB_STATUSES,
} from "@/lib/crm/constants";
import type {
  CrmUserRole,
  IntegrationProvider,
  IntegrationStatus,
  LeadCustomerType,
  LeadPriority,
  LeadSource,
  SourcePayloadProcessingStatus,
  SyncJobStatus,
} from "@/lib/crm/types";
import {
  CUSTOM_FIELD_TYPES,
  FORM_FIELD_CORE_TARGETS,
  FORM_FIELD_TARGET_TYPES,
  FORM_SOURCE_TYPES,
  LEAD_INTAKE_EVENT_STATUSES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES,
  NOTIFICATION_TYPES,
  SALES_TARGET_PERIODS,
  SALES_TARGET_SCOPES,
} from "@/lib/crm/domain";

export const leadPriorityEnum = pgEnum("lead_priority", LEAD_PRIORITIES);
export const crmUserRoleEnum = pgEnum("crm_user_role", CRM_USER_ROLES);
export const sourcePayloadProcessingStatusEnum = pgEnum(
  "source_payload_processing_status",
  SOURCE_PAYLOAD_PROCESSING_STATUSES,
);
export const integrationProviderEnum = pgEnum("integration_provider", INTEGRATION_PROVIDERS);
export const integrationStatusEnum = pgEnum("integration_status", INTEGRATION_STATUSES);
export const syncJobStatusEnum = pgEnum("sync_job_status", SYNC_JOB_STATUSES);
export const customFieldTypeEnum = pgEnum("custom_field_type", CUSTOM_FIELD_TYPES);
export const formSourceTypeEnum = pgEnum("form_source_type", FORM_SOURCE_TYPES);
export const formFieldTargetTypeEnum = pgEnum("form_field_target_type", FORM_FIELD_TARGET_TYPES);
export const formFieldCoreTargetEnum = pgEnum("form_field_core_target", FORM_FIELD_CORE_TARGETS);
export const leadIntakeEventStatusEnum = pgEnum("lead_intake_event_status", LEAD_INTAKE_EVENT_STATUSES);
export const notificationTypeEnum = pgEnum("notification_type", NOTIFICATION_TYPES);
export const notificationChannelEnum = pgEnum("notification_channel", NOTIFICATION_CHANNELS);
export const notificationStatusEnum = pgEnum("notification_status", NOTIFICATION_STATUSES);
export const salesTargetScopeEnum = pgEnum("sales_target_scope", SALES_TARGET_SCOPES);
export const salesTargetPeriodEnum = pgEnum("sales_target_period", SALES_TARGET_PERIODS);
export const leadOpportunityStatusEnum = pgEnum("lead_opportunity_status", [
  "active",
  "qualified",
  "unqualified",
  "lost",
  "won",
  "on_hold",
]);

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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    customFieldIdIdx: index("custom_field_options_custom_field_id_idx").on(table.customFieldId),
    archivedIdx: index("custom_field_options_archived_idx").on(table.archived),
  }),
);

export const leadCustomFieldValues = pgTable(
  "lead_custom_field_values",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    customFieldId: uuid("custom_field_id")
      .notNull()
      .references(() => customFields.id, { onDelete: "cascade" }),
    value: jsonb("value").$type<unknown>().notNull(),
    displayValue: text("display_value"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    leadIdIdx: index("lead_custom_field_values_lead_id_idx").on(table.leadId),
    customFieldIdIdx: index("lead_custom_field_values_custom_field_id_idx").on(table.customFieldId),
    leadIdCustomFieldIdUnique: uniqueIndex("lead_custom_field_values_lead_field_unique").on(
      table.leadId,
      table.customFieldId,
    ),
  }),
);

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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    typeIdx: index("form_sources_type_idx").on(table.type),
    webhookKeyUnique: uniqueIndex("form_sources_webhook_key_unique").on(table.webhookKey),
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
    customFieldId: uuid("custom_field_id").references(() => customFields.id, { onDelete: "set null" }),
    required: boolean("required").notNull().default(false),
    transformRule: text("transform_rule"),
    fallbackValue: text("fallback_value"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    formSourceIdIdx: index("form_field_mappings_form_source_id_idx").on(table.formSourceId),
    customFieldIdIdx: index("form_field_mappings_custom_field_id_idx").on(table.customFieldId),
  }),
);

export const leadIntakeEvents = pgTable(
  "lead_intake_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    formSourceId: uuid("form_source_id").references(() => formSources.id, { onDelete: "set null" }),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
    rawPayload: jsonb("raw_payload").$type<Record<string, unknown> | null>().notNull(),
    normalizedPayload: jsonb("normalized_payload").$type<Record<string, unknown> | null>(),
    status: leadIntakeEventStatusEnum("status").notNull(),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    formSourceIdIdx: index("lead_intake_events_form_source_id_idx").on(table.formSourceId),
    leadIdIdx: index("lead_intake_events_lead_id_idx").on(table.leadId),
    statusIdx: index("lead_intake_events_status_idx").on(table.status),
    createdAtIdx: index("lead_intake_events_created_at_idx").on(table.createdAt),
  }),
);

export const notificationEvents = pgTable(
  "notification_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: notificationTypeEnum("type").notNull(),
    channel: notificationChannelEnum("channel").notNull(),
    recipientUserId: uuid("recipient_user_id"),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    message: text("message").notNull(),
    status: notificationStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (table) => ({
    recipientUserIdIdx: index("notification_events_recipient_user_id_idx").on(table.recipientUserId),
    leadIdIdx: index("notification_events_lead_id_idx").on(table.leadId),
    statusIdx: index("notification_events_status_idx").on(table.status),
    createdAtIdx: index("notification_events_created_at_idx").on(table.createdAt),
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
    loginBackgroundUrl: text("login_background_url"),
    loginHeadline: text("login_headline"),
    loginSubheadline: text("login_subheadline"),
    navigationConfig: jsonb("navigation_config").$type<Record<string, unknown> | null>(),
    dashboardConfig: jsonb("dashboard_config").$type<Record<string, unknown> | null>(),
    leadPreviewConfig: jsonb("lead_preview_config").$type<Record<string, unknown> | null>(),
    industryPreset: text("industry_preset").notNull().default("general_business"),
    globalCurrency: text("global_currency").notNull().default("USD"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    updatedAtIdx: index("company_settings_updated_at_idx").on(table.updatedAt),
  }),
);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    source: text("source").$type<LeadSource>().notNull().default("manual_entry"),
    sourceDetail: text("source_detail"),
    priority: leadPriorityEnum("priority").$type<LeadPriority>().notNull().default("medium"),
    leadCustomerType: text("lead_customer_type").$type<LeadCustomerType>().notNull().default("direct"),
    assignedTo: text("assigned_to"),
    companyName: text("company_name"),
    sourceId: uuid("source_id"),
    stageId: uuid("stage_id"),
    campaignId: text("campaign_id"),
    campaignLabel: text("campaign_label"),
    assignedUserId: uuid("assigned_user_id"),
    teamId: uuid("team_id"),
    branchId: uuid("branch_id"),
    departmentId: uuid("department_id"),
    estimatedValue: numeric("estimated_value", { precision: 12, scale: 2 }),
    expectedValue: numeric("expected_value", { precision: 12, scale: 2 }),
    wonValue: numeric("won_value", { precision: 12, scale: 2 }),
    closeProbability: integer("close_probability"),
    expectedCloseDate: timestamp("expected_close_date", { withTimezone: true }),
    wonAt: timestamp("won_at", { withTimezone: true }),
    lostAt: timestamp("lost_at", { withTimezone: true }),
    lostReason: text("lost_reason"),
    nextFollowUpAt: timestamp("next_follow_up_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    firstName: text("first_name").notNull().default(""),
    lastName: text("last_name").notNull().default(""),
    email: text("email").notNull().default(""),
    whatsappNumber: text("whatsapp_number").notNull().default(""),
    state: text("state"),
    country: text("country"),
    region: text("region"),
    city: text("city"),
    address: text("address"),
    postalCode: text("postal_code"),
    externalLeadId: text("external_lead_id"),
    externalFormId: text("external_form_id"),
    facebookLeadgenId: text("facebook_leadgen_id"),
    facebookFormId: text("facebook_form_id"),
    facebookPageId: text("facebook_page_id"),
    facebookCampaignId: text("facebook_campaign_id"),
    facebookAdId: text("facebook_ad_id"),
    facebookAdsetId: text("facebook_adset_id"),
    googleClickId: text("google_click_id"),
    googleCampaignId: text("google_campaign_id"),
    googleAdGroupId: text("google_ad_group_id"),
    googleAdId: text("google_ad_id"),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    utmContent: text("utm_content"),
    utmTerm: text("utm_term"),
    landingPage: text("landing_page"),
    sourcePayload: jsonb("source_payload").$type<Record<string, unknown> | null>(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: text("deleted_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sourceIdx: index("leads_source_idx").on(table.source),
    sourceIdIdx: index("leads_source_id_idx").on(table.sourceId),
    priorityIdx: index("leads_priority_idx").on(table.priority),
    customerTypeIdx: index("leads_customer_type_idx").on(table.leadCustomerType),
    assignedToIdx: index("leads_assigned_to_idx").on(table.assignedTo),
    assignedUserIdIdx: index("leads_assigned_user_id_idx").on(table.assignedUserId),
    stageIdIdx: index("leads_stage_id_idx").on(table.stageId),
    teamIdIdx: index("leads_team_id_idx").on(table.teamId),
    branchIdIdx: index("leads_branch_id_idx").on(table.branchId),
    departmentIdIdx: index("leads_department_id_idx").on(table.departmentId),
    nextFollowUpAtIdx: index("leads_next_follow_up_at_idx").on(table.nextFollowUpAt),
    archivedAtIdx: index("leads_archived_at_idx").on(table.archivedAt),
    deletedAtIdx: index("leads_deleted_at_idx").on(table.deletedAt),
    createdAtIdx: index("leads_created_at_idx").on(table.createdAt),
    updatedAtIdx: index("leads_updated_at_idx").on(table.updatedAt),
    updatedAtIdIdx: index("leads_updated_at_id_idx").on(table.updatedAt, table.id),
    activeQueueIdx: index("leads_active_queue_idx").on(
      table.deletedAt,
      table.updatedAt,
      table.id,
    ),
    ownerActiveQueueIdx: index("leads_owner_active_queue_idx").on(
      table.assignedUserId,
      table.deletedAt,
      table.updatedAt,
      table.id,
    ),
    stageActiveQueueIdx: index("leads_stage_active_queue_idx").on(
      table.stageId,
      table.deletedAt,
      table.updatedAt,
      table.id,
    ),
    sourceActiveQueueIdx: index("leads_source_active_queue_idx").on(
      table.sourceId,
      table.deletedAt,
      table.updatedAt,
      table.id,
    ),
    customerTypeActiveQueueIdx: index("leads_customer_type_active_queue_idx").on(
      table.leadCustomerType,
      table.deletedAt,
      table.updatedAt,
      table.id,
    ),
    emailIdx: index("leads_email_idx").on(table.email),
    whatsappNumberIdx: index("leads_whatsapp_number_idx").on(table.whatsappNumber),
    stateIdx: index("leads_state_idx").on(table.state),
    countryIdx: index("leads_country_idx").on(table.country),
    regionIdx: index("leads_region_idx").on(table.region),
    cityIdx: index("leads_city_idx").on(table.city),
    sourceExternalLeadIdUnique: uniqueIndex("leads_source_external_lead_id_unique").on(
      table.source,
      table.externalLeadId,
    ),
    facebookLeadgenIdUnique: uniqueIndex("leads_facebook_leadgen_id_unique").on(
      table.facebookLeadgenId,
    ),
    googleClickIdIdx: index("leads_google_click_id_idx").on(table.googleClickId),
    utmCampaignIdx: index("leads_utm_campaign_idx").on(table.utmCampaign),
  }),
);

export const leadOpportunities = pgTable(
  "lead_opportunities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    offerLabel: text("offer_label").notNull(),
    status: leadOpportunityStatusEnum("status").notNull().default("active"),
    estimatedValue: numeric("estimated_value", { precision: 12, scale: 2 }),
    expectedValue: numeric("expected_value", { precision: 12, scale: 2 }),
    currency: text("currency"),
    exchangeRateToGlobal: numeric("exchange_rate_to_global", { precision: 18, scale: 8 }),
    closeProbability: integer("close_probability"),
    expectedCloseDate: timestamp("expected_close_date", { withTimezone: true }),
    reason: text("reason"),
    notes: text("notes"),
    isPrimary: boolean("is_primary").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    leadIdIdx: index("lead_opportunities_lead_id_idx").on(table.leadId),
    statusIdx: index("lead_opportunities_status_idx").on(table.status),
    primaryIdx: index("lead_opportunities_is_primary_idx").on(table.isPrimary),
    activePrimaryUnique: uniqueIndex("lead_opportunities_active_primary_unique")
      .on(table.leadId)
      .where(sql`${table.isPrimary} = true and ${table.archivedAt} is null`),
    pipelineIdx: index("lead_opportunities_pipeline_idx").on(
      table.archivedAt,
      table.status,
      table.leadId,
    ),
    archivedAtIdx: index("lead_opportunities_archived_at_idx").on(table.archivedAt),
    sortOrderIdx: index("lead_opportunities_sort_order_idx").on(table.sortOrder),
    probabilityCheck: check(
      "lead_opportunities_probability_check",
      sql`${table.closeProbability} is null or (${table.closeProbability} >= 0 and ${table.closeProbability} <= 100)`,
    ),
    estimatedValueCheck: check(
      "lead_opportunities_estimated_value_check",
      sql`${table.estimatedValue} is null or ${table.estimatedValue} >= 0`,
    ),
    expectedValueCheck: check(
      "lead_opportunities_expected_value_check",
      sql`${table.expectedValue} is null or ${table.expectedValue} >= 0`,
    ),
    exchangeRateCheck: check(
      "lead_opportunities_exchange_rate_check",
      sql`${table.exchangeRateToGlobal} is null or ${table.exchangeRateToGlobal} > 0`,
    ),
    sortOrderCheck: check(
      "lead_opportunities_sort_order_check",
      sql`${table.sortOrder} >= 0`,
    ),
    reasonCheck: check(
      "lead_opportunities_reason_check",
      sql`${table.status} not in ('lost', 'unqualified') or nullif(trim(${table.reason}), '') is not null`,
    ),
  }),
);

export const crmUsers = pgTable(
  "crm_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    fullName: text("full_name").notNull().default(""),
    avatarUrl: text("avatar_url"),
    role: crmUserRoleEnum("role").$type<CrmUserRole>().notNull().default("sales_agent"),
    isActive: boolean("is_active").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailUnique: uniqueIndex("crm_users_email_unique").on(table.email),
    roleIdx: index("crm_users_role_idx").on(table.role),
    isActiveIdx: index("crm_users_is_active_idx").on(table.isActive),
  }),
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    role: crmUserRoleEnum("role").$type<CrmUserRole>().notNull(),
    permission: text("permission").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    rolePermissionUnique: uniqueIndex("role_permissions_role_permission_unique").on(table.role, table.permission),
    roleIdx: index("role_permissions_role_idx").on(table.role),
  }),
);

export const leadEvents = pgTable(
  "lead_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    eventData: jsonb("event_data").$type<Record<string, unknown> | null>(),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    leadIdIdx: index("lead_events_lead_id_idx").on(table.leadId),
    eventTypeIdx: index("lead_events_event_type_idx").on(table.eventType),
    createdAtIdx: index("lead_events_created_at_idx").on(table.createdAt),
  }),
);

export const leadNotes = pgTable(
  "lead_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    note: text("note").notNull(),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    leadIdIdx: index("lead_notes_lead_id_idx").on(table.leadId),
    createdAtIdx: index("lead_notes_created_at_idx").on(table.createdAt),
  }),
);

export const leadTasks = pgTable(
  "lead_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    assignedTo: text("assigned_to"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    leadIdIdx: index("lead_tasks_lead_id_idx").on(table.leadId),
    assignedToIdx: index("lead_tasks_assigned_to_idx").on(table.assignedTo),
    dueAtIdx: index("lead_tasks_due_at_idx").on(table.dueAt),
    completedAtIdx: index("lead_tasks_completed_at_idx").on(table.completedAt),
  }),
);

export const leadSourcePayloads = pgTable(
  "lead_source_payloads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    source: text("source").notNull(),
    externalId: text("external_id"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    processingStatus: sourcePayloadProcessingStatusEnum("processing_status")
      .$type<SourcePayloadProcessingStatus>()
      .notNull()
      .default("pending"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    retryCount: integer("retry_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sourceIdx: index("lead_source_payloads_source_idx").on(table.source),
    externalIdIdx: index("lead_source_payloads_external_id_idx").on(table.externalId),
    processingStatusIdx: index("lead_source_payloads_processing_status_idx").on(
      table.processingStatus,
    ),
    sourceExternalIdIdx: index("lead_source_payloads_source_external_id_idx").on(
      table.source,
      table.externalId,
    ),
  }),
);

export const integrations = pgTable(
  "integrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: integrationProviderEnum("provider").$type<IntegrationProvider>().notNull(),
    accountName: text("account_name"),
    externalAccountId: text("external_account_id"),
    status: integrationStatusEnum("status")
      .$type<IntegrationStatus>()
      .notNull()
      .default("not_configured"),
    accessTokenEncrypted: text("access_token_encrypted"),
    refreshTokenEncrypted: text("refresh_token_encrypted"),
    config: jsonb("config").$type<Record<string, unknown> | null>(),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    providerIdx: index("integrations_provider_idx").on(table.provider),
    statusIdx: index("integrations_status_idx").on(table.status),
    providerAccountIdx: uniqueIndex("integrations_provider_account_unique").on(
      table.provider,
      table.externalAccountId,
    ),
  }),
);

export const syncJobs = pgTable(
  "sync_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: integrationProviderEnum("provider").$type<IntegrationProvider>().notNull(),
    jobType: text("job_type").notNull(),
    status: syncJobStatusEnum("status").$type<SyncJobStatus>().notNull().default("pending"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    providerStatusIdx: index("sync_jobs_provider_status_idx").on(table.provider, table.status),
    createdAtIdx: index("sync_jobs_created_at_idx").on(table.createdAt),
  }),
);

export const adCampaignMetrics = pgTable(
  "ad_campaign_metrics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: integrationProviderEnum("provider").$type<IntegrationProvider>().notNull(),
    accountId: text("account_id").notNull().default(""),
    campaignId: text("campaign_id").notNull().default(""),
    campaignName: text("campaign_name").notNull().default(""),
    adGroupId: text("ad_group_id").notNull().default(""),
    adGroupName: text("ad_group_name").notNull().default(""),
    adId: text("ad_id").notNull().default(""),
    adName: text("ad_name").notNull().default(""),
    date: date("date", { mode: "string" }).notNull(),
    impressions: integer("impressions").notNull().default(0),
    clicks: integer("clicks").notNull().default(0),
    spend: numeric("spend", { precision: 12, scale: 2 }).notNull().default("0"),
    leads: integer("leads").notNull().default(0),
    conversions: integer("conversions").notNull().default(0),
    rawMetrics: jsonb("raw_metrics").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    campaignDateIdx: index("ad_campaign_metrics_provider_campaign_date_idx").on(
      table.provider,
      table.campaignId,
      table.date,
    ),
    lookupUnique: uniqueIndex("ad_campaign_metrics_lookup_unique").on(
      table.provider,
      table.accountId,
      table.campaignId,
      table.adGroupId,
      table.adId,
      table.date,
    ),
  }),
);


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

export const migrationArchives = pgTable(
  "migration_archives",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceSystem: text("source_system").notNull(),
    recordType: text("record_type").notNull(),
    sourceRecordId: text("source_record_id").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    migratedAt: timestamp("migrated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sourceRecordUnique: uniqueIndex("migration_archives_source_record_unique").on(
      table.sourceSystem,
      table.recordType,
      table.sourceRecordId,
    ),
    sourceSystemIdx: index("migration_archives_source_system_idx").on(table.sourceSystem),
    migratedAtIdx: index("migration_archives_migrated_at_idx").on(table.migratedAt),
  }),
);

export const dataImports = pgTable(
  "data_imports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceSystem: text("source_system").notNull(),
    sourceFileName: text("source_file_name"),
    sourceFileSha256: text("source_file_sha256"),
    status: text("status").notNull().default("staged"),
    mode: text("mode").notNull().default("validate"),
    fieldMapping: jsonb("field_mapping").$type<Record<string, unknown> | null>(),
    summary: jsonb("summary").$type<Record<string, unknown> | null>(),
    createdBy: text("created_by"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    rolledBackAt: timestamp("rolled_back_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusCreatedIdx: index("data_imports_status_created_idx").on(table.status, table.createdAt),
    sourceCreatedIdx: index("data_imports_source_created_idx").on(table.sourceSystem, table.createdAt),
    createdByIdx: index("data_imports_created_by_idx").on(table.createdBy),
    statusCheck: check(
      "data_imports_status_check",
      sql`${table.status} in ('staged', 'validating', 'validated', 'importing', 'completed', 'completed_with_errors', 'failed', 'rolled_back')`,
    ),
    modeCheck: check(
      "data_imports_mode_check",
      sql`${table.mode} in ('validate', 'commit')`,
    ),
  }),
);

export const dataImportRecords = pgTable(
  "data_import_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    importId: uuid("import_id")
      .notNull()
      .references(() => dataImports.id, { onDelete: "cascade" }),
    rowNumber: integer("row_number").notNull(),
    objectType: text("object_type").notNull().default("lead"),
    sourceRecordId: text("source_record_id"),
    sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
    status: text("status").notNull().default("pending"),
    checksum: text("checksum").notNull(),
    rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>().notNull(),
    normalizedPayload: jsonb("normalized_payload").$type<Record<string, unknown> | null>(),
    previousLeadSnapshot: jsonb("previous_lead_snapshot").$type<Record<string, unknown> | null>(),
    resultAction: text("result_action"),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    importStatusRowIdx: index("data_import_records_import_status_row_idx").on(
      table.importId,
      table.status,
      table.rowNumber,
    ),
    leadIdIdx: index("data_import_records_lead_id_idx").on(table.leadId),
    sourceRecordIdx: index("data_import_records_source_record_idx").on(
      table.objectType,
      table.sourceRecordId,
    ),
    importSourceRecordUnique: uniqueIndex("data_import_records_import_source_unique")
      .on(table.importId, table.objectType, table.sourceRecordId)
      .where(sql`${table.sourceRecordId} is not null`),
    rowNumberCheck: check("data_import_records_row_number_check", sql`${table.rowNumber} >= 1`),
    statusCheck: check(
      "data_import_records_status_check",
      sql`${table.status} in ('pending', 'valid', 'imported', 'updated', 'failed', 'skipped', 'rolled_back')`,
    ),
  }),
);

export type LeadRow = typeof leads.$inferSelect;
export type NewLeadRow = typeof leads.$inferInsert;
export type LeadOpportunityRow = typeof leadOpportunities.$inferSelect;
export type MigrationArchiveRow = typeof migrationArchives.$inferSelect;
export type DataImportRow = typeof dataImports.$inferSelect;
export type DataImportRecordRow = typeof dataImportRecords.$inferSelect;
export type BranchRow = typeof branches.$inferSelect;
export type DepartmentRow = typeof departments.$inferSelect;
export type TeamRow = typeof teams.$inferSelect;
export type LeadStageRow = typeof leadStages.$inferSelect;
export type LeadSourceRow = typeof leadSources.$inferSelect;
export type CustomFieldRow = typeof customFields.$inferSelect;
export type CustomFieldOptionRow = typeof customFieldOptions.$inferSelect;
export type LeadCustomFieldValueRow = typeof leadCustomFieldValues.$inferSelect;
export type FormSourceRow = typeof formSources.$inferSelect;
export type FormFieldMappingRow = typeof formFieldMappings.$inferSelect;
export type LeadIntakeEventRow = typeof leadIntakeEvents.$inferSelect;
export type NotificationEventRow = typeof notificationEvents.$inferSelect;
export type SalesTargetRow = typeof salesTargets.$inferSelect;
export type CompanySettingsRow = typeof companySettings.$inferSelect;
export type CrmUserRow = typeof crmUsers.$inferSelect;
export type LeadEventRow = typeof leadEvents.$inferSelect;
export type LeadNoteRow = typeof leadNotes.$inferSelect;
export type LeadTaskRow = typeof leadTasks.$inferSelect;
export type LeadSourcePayloadRow = typeof leadSourcePayloads.$inferSelect;
export type IntegrationRow = typeof integrations.$inferSelect;
export type SyncJobRow = typeof syncJobs.$inferSelect;
export type AdCampaignMetricRow = typeof adCampaignMetrics.$inferSelect;
export type FormRow = typeof forms.$inferSelect;
export type NewFormRow = typeof forms.$inferInsert;
export type FormFieldRow = typeof formFields.$inferSelect;
export type NewFormFieldRow = typeof formFields.$inferInsert;
export type FormRuleRow = typeof formRules.$inferSelect;
export type NewFormRuleRow = typeof formRules.$inferInsert;
export type FormSubmissionRow = typeof formSubmissions.$inferSelect;
export type NewFormSubmissionRow = typeof formSubmissions.$inferInsert;
