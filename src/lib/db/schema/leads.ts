import { boolean, check, index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { LeadCustomerType, LeadPriority, LeadSource } from "@/lib/crm/types";
import { leadPriorityEnum, leadOpportunityStatusEnum } from './enums';

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    source: text("source").$type<LeadSource>().notNull().default("manual_entry"),
    sourceDetail: text("source_detail"),
    priority: leadPriorityEnum("priority").$type<LeadPriority>().notNull().default("medium"),
    leadCustomerType: text("lead_customer_type").$type<LeadCustomerType>().notNull().default("direct"),
    assignedTo: text("assigned_to"),
    affiliateReferrerId: uuid("affiliate_referrer_id"),
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
    callNumber: text("call_number").notNull().default(""),
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
    affiliateReferrerIdx: index("leads_affiliate_referrer_id_idx").on(table.affiliateReferrerId),
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

export const currencyExchangeRates = pgTable(
  "currency_exchange_rates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    baseCurrency: text("base_currency").notNull(),
    quoteCurrency: text("quote_currency").notNull(),
    rate: numeric("rate", { precision: 18, scale: 8 }).notNull(),
    source: text("source").notNull().default("manual"),
    updatedBy: text("updated_by"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pairUnique: uniqueIndex("currency_exchange_rates_pair_unique").on(
      table.baseCurrency,
      table.quoteCurrency,
    ),
    sourceIdx: index("currency_exchange_rates_source_idx").on(table.source),
    positiveRateCheck: check(
      "currency_exchange_rates_positive_rate_check",
      sql`${table.rate} > 0`,
    ),
    differentCurrencyCheck: check(
      "currency_exchange_rates_different_currency_check",
      sql`${table.baseCurrency} <> ${table.quoteCurrency}`,
    ),
    sourceCheck: check(
      "currency_exchange_rates_source_check",
      sql`${table.source} in ('manual', 'automatic')`,
    ),
  }),
);

export type LeadRow = typeof leads.$inferSelect;

export type NewLeadRow = typeof leads.$inferInsert;

export type LeadOpportunityRow = typeof leadOpportunities.$inferSelect;

export type CurrencyExchangeRateRow = typeof currencyExchangeRates.$inferSelect;
