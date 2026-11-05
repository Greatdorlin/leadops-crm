import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import { normalizeText } from "@/lib/crm/value-normalization";
import type { DatabaseExecutor } from "@/lib/db/client";
import { adCampaignMetrics } from "@/lib/db/schema";
import type { AdCampaignMetricListFilters, AdCampaignMetricUpsertInput, LeadStorage } from "./types";
import { formatSpend } from './values';
import { mapAdCampaignMetricRecord } from './mappers';

export async function upsertAdCampaignMetric(this: LeadStorage, getDatabase: () => DatabaseExecutor, input: AdCampaignMetricUpsertInput) {
    const db = getDatabase();
    const [record] = await db
      .insert(adCampaignMetrics)
      .values({
        provider: input.provider,
        accountId: input.accountId,
        campaignId: input.campaignId,
        campaignName: input.campaignName,
        adGroupId: normalizeText(input.adGroupId) ?? "",
        adGroupName: normalizeText(input.adGroupName) ?? "",
        adId: normalizeText(input.adId) ?? "",
        adName: normalizeText(input.adName) ?? "",
        date: input.date,
        impressions: input.impressions,
        clicks: input.clicks,
        spend: formatSpend(input.spend),
        leads: input.leads,
        conversions: input.conversions,
        rawMetrics: input.rawMetrics ?? null,
      })
      .onConflictDoUpdate({
        target: [
          adCampaignMetrics.provider,
          adCampaignMetrics.accountId,
          adCampaignMetrics.campaignId,
          adCampaignMetrics.adGroupId,
          adCampaignMetrics.adId,
          adCampaignMetrics.date,
        ],
        set: {
          campaignName: input.campaignName,
          adGroupName: normalizeText(input.adGroupName) ?? "",
          adName: normalizeText(input.adName) ?? "",
          impressions: input.impressions,
          clicks: input.clicks,
          spend: formatSpend(input.spend),
          leads: input.leads,
          conversions: input.conversions,
          rawMetrics: input.rawMetrics ?? null,
        },
      })
      .returning();

    return mapAdCampaignMetricRecord(record);
  }

export async function listAdCampaignMetrics(this: LeadStorage, getDatabase: () => DatabaseExecutor, filters: AdCampaignMetricListFilters = {}) {
    const db = getDatabase();
    const conditions: SQL[] = [];

    if (filters.provider) {
      conditions.push(eq(adCampaignMetrics.provider, filters.provider));
    }

    if (filters.campaignId?.trim()) {
      conditions.push(eq(adCampaignMetrics.campaignId, filters.campaignId.trim()));
    }

    if (filters.dateFrom) {
      conditions.push(gte(adCampaignMetrics.date, filters.dateFrom));
    }

    if (filters.dateTo) {
      conditions.push(lte(adCampaignMetrics.date, filters.dateTo));
    }

    const records = await db.query.adCampaignMetrics.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(adCampaignMetrics.date), desc(adCampaignMetrics.createdAt)],
    });

    return records.map(mapAdCampaignMetricRecord);
  }
