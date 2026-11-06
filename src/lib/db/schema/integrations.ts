import {
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type {
  IntegrationProvider,
  IntegrationStatus,
  SourcePayloadProcessingStatus,
  SyncJobStatus,
} from "@/lib/crm/types";
import {
  sourcePayloadProcessingStatusEnum,
  integrationProviderEnum,
  integrationStatusEnum,
  syncJobStatusEnum,
} from "./enums";

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
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    sourceIdx: index("lead_source_payloads_source_idx").on(table.source),
    externalIdIdx: index("lead_source_payloads_external_id_idx").on(
      table.externalId,
    ),
    processingStatusIdx: index("lead_source_payloads_processing_status_idx").on(
      table.processingStatus,
    ),
    sourceExternalIdIdx: index(
      "lead_source_payloads_source_external_id_idx",
    ).on(table.source, table.externalId),
  }),
);

export const integrations = pgTable(
  "integrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: integrationProviderEnum("provider")
      .$type<IntegrationProvider>()
      .notNull(),
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
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
    provider: integrationProviderEnum("provider")
      .$type<IntegrationProvider>()
      .notNull(),
    jobType: text("job_type").notNull(),
    status: syncJobStatusEnum("status")
      .$type<SyncJobStatus>()
      .notNull()
      .default("pending"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    providerStatusIdx: index("sync_jobs_provider_status_idx").on(
      table.provider,
      table.status,
    ),
    createdAtIdx: index("sync_jobs_created_at_idx").on(table.createdAt),
  }),
);

export const adCampaignMetrics = pgTable(
  "ad_campaign_metrics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: integrationProviderEnum("provider")
      .$type<IntegrationProvider>()
      .notNull(),
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
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

export type LeadSourcePayloadRow = typeof leadSourcePayloads.$inferSelect;

export type IntegrationRow = typeof integrations.$inferSelect;

export type SyncJobRow = typeof syncJobs.$inferSelect;

export type AdCampaignMetricRow = typeof adCampaignMetrics.$inferSelect;
