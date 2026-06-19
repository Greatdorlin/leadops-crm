import {
  boolean,
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
import {
  COMPLETION_STATUSES,
  CRM_STATUSES,
  CRM_USER_ROLES,
  INTEGRATION_PROVIDERS,
  INTEGRATION_STATUSES,
  LEAD_PRIORITIES,
  PRIMARY_GOALS,
  SOURCE_PAYLOAD_PROCESSING_STATUSES,
  SYNC_JOB_STATUSES,
  SYNC_STATES,
  type AssessmentAnswers,
  type AssessmentStepKey,
  type CrmUserRole,
  type GeneratedReport,
  type IntegrationProvider,
  type IntegrationStatus,
  type LeadPriority,
  type LeadSource,
  type PublicAssessmentResult,
  type SourcePayloadProcessingStatus,
  type SyncJobStatus,
} from "@/lib/pathway-engine/types";
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

export const completionStatusEnum = pgEnum("completion_status", COMPLETION_STATUSES);
export const crmStatusEnum = pgEnum("crm_status", CRM_STATUSES);
export const syncStateEnum = pgEnum("sync_state", SYNC_STATES);
export const primaryGoalEnum = pgEnum("primary_goal", PRIMARY_GOALS);
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

export const branches = pgTable(
  "branches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    location: text("location"),
    managerUserId: uuid("manager_user_id"),
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
    currency: text("currency").notNull().default("NGN"),
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
    reportToken: uuid("report_token"),
    completionStatus: completionStatusEnum("completion_status").notNull().default("incomplete"),
    crmStatus: crmStatusEnum("crm_status").notNull().default("new"),
    source: text("source").$type<LeadSource>().notNull().default("pathway_finder"),
    sourceDetail: text("source_detail"),
    priority: leadPriorityEnum("priority").$type<LeadPriority>().notNull().default("medium"),
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
    primaryGoal: primaryGoalEnum("primary_goal"),
    currentStepKey: text("current_step_key")
      .$type<AssessmentStepKey>()
      .notNull()
      .default("first_name"),
    currentStepIndex: integer("current_step_index").notNull().default(0),
    progressPercent: integer("progress_percent").notNull().default(0),
    readinessLevel: text("readiness_level"),
    topPathwayTitle: text("top_pathway_title"),
    answers: jsonb("answers").$type<AssessmentAnswers>().notNull(),
    report: jsonb("report").$type<GeneratedReport | null>(),
    publicReport: jsonb("public_report").$type<PublicAssessmentResult | null>(),
    analytics: jsonb("analytics")
      .$type<{
        whatsappClicked: boolean;
        consultationClicked: boolean;
        reportViewed: boolean;
      }>()
      .notNull(),
    sync: jsonb("sync")
      .$type<{
        googleSheets: {
          status: (typeof SYNC_STATES)[number];
          message?: string;
          lastAttemptAt?: string | null;
          syncedAt?: string | null;
        };
        sender: {
          status: (typeof SYNC_STATES)[number];
          message?: string;
          lastAttemptAt?: string | null;
          syncedAt?: string | null;
        };
      }>()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: text("deleted_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    reportTokenUnique: uniqueIndex("leads_report_token_unique").on(table.reportToken),
    completionStatusIdx: index("leads_completion_status_idx").on(table.completionStatus),
    crmStatusIdx: index("leads_crm_status_idx").on(table.crmStatus),
    primaryGoalIdx: index("leads_primary_goal_idx").on(table.primaryGoal),
    sourceIdx: index("leads_source_idx").on(table.source),
    sourceIdIdx: index("leads_source_id_idx").on(table.sourceId),
    priorityIdx: index("leads_priority_idx").on(table.priority),
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
    emailIdx: index("leads_email_idx").on(table.email),
    whatsappNumberIdx: index("leads_whatsapp_number_idx").on(table.whatsappNumber),
    stateIdx: index("leads_state_idx").on(table.state),
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

export const crmUsers = pgTable(
  "crm_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    fullName: text("full_name").notNull().default(""),
    role: crmUserRoleEnum("role").$type<CrmUserRole>().notNull().default("sales_agent"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailUnique: uniqueIndex("crm_users_email_unique").on(table.email),
    roleIdx: index("crm_users_role_idx").on(table.role),
    isActiveIdx: index("crm_users_is_active_idx").on(table.isActive),
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

export type LeadRow = typeof leads.$inferSelect;
export type NewLeadRow = typeof leads.$inferInsert;
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
