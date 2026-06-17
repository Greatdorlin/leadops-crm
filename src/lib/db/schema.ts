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
    priorityIdx: index("leads_priority_idx").on(table.priority),
    assignedToIdx: index("leads_assigned_to_idx").on(table.assignedTo),
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
export type CrmUserRow = typeof crmUsers.$inferSelect;
export type LeadEventRow = typeof leadEvents.$inferSelect;
export type LeadNoteRow = typeof leadNotes.$inferSelect;
export type LeadTaskRow = typeof leadTasks.$inferSelect;
export type LeadSourcePayloadRow = typeof leadSourcePayloads.$inferSelect;
export type IntegrationRow = typeof integrations.$inferSelect;
export type SyncJobRow = typeof syncJobs.$inferSelect;
export type AdCampaignMetricRow = typeof adCampaignMetrics.$inferSelect;
