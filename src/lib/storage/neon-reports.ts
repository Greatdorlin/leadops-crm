import { and, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import type { DatabaseExecutor } from "@/lib/db/client";
import { adCampaignMetrics, leads } from "@/lib/db/schema";
import type { CampaignReportItem, LeadDistributionReport, LeadListFilters, LeadStorage, SourceReportItem } from "./types";
import { formatSpend } from './values';
import { buildLeadListConditions } from './filters';

export async function getSourceReport(this: LeadStorage, getDatabase: () => DatabaseExecutor, filters: LeadListFilters = {}) {
    const db = getDatabase();
    const conditions = buildLeadListConditions({ ...filters, recordState: "active" });
    const rows = await db
      .select({
        source: leads.source,
        leadCount: sql<number>`count(*)`,
        qualifiedCount: sql<number>`count(*) filter (
          where ${leads.wonAt} is not null
            or ${leads.stageId} is not null
            or ${leads.estimatedValue} is not null
            or ${leads.expectedValue} is not null
        )`,
        convertedCount: sql<number>`count(*) filter (where ${leads.wonAt} is not null)`,
        highPriorityCount: sql<number>`count(*) filter (
          where ${leads.priority} in ('high', 'urgent')
        )`,
      })
      .from(leads)
      .where(and(...conditions))
      .groupBy(leads.source);

    return rows
      .map<SourceReportItem>((row) => ({
        source: row.source ?? "unknown",
        leadCount: Number(row.leadCount),
        qualifiedCount: Number(row.qualifiedCount),
        convertedCount: Number(row.convertedCount),
        highPriorityCount: Number(row.highPriorityCount),
      }))
      .sort((left, right) => right.leadCount - left.leadCount);
  }

export async function getLeadDistributionReport(this: LeadStorage, getDatabase: () => DatabaseExecutor,
    filters: LeadListFilters = {},
  ): Promise<LeadDistributionReport> {
    const db = getDatabase();
    const conditions = buildLeadListConditions(filters);
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const interestLabel = sql<string>`coalesce(
      nullif(trim(coalesce(${leads.sourceDetail}, '')), ''),
      nullif(trim(coalesce(${leads.campaignLabel}, '')), ''),
      nullif(trim(coalesce(${leads.companyName}, '')), ''),
      'Not set'
    )`;
    const locationLabel = sql<string>`coalesce(
      nullif(trim(coalesce(${leads.city}, '')), ''),
      nullif(trim(coalesce(${leads.region}, '')), ''),
      nullif(trim(coalesce(${leads.country}, '')), ''),
      'Not yet set'
    )`;
    const leadCount = sql<number>`count(*)`;

    const [interestRows, locationRows] = await Promise.all([
      db
        .select({ label: interestLabel, value: leadCount })
        .from(leads)
        .where(where)
        .groupBy(interestLabel)
        .orderBy(desc(leadCount))
        .limit(10),
      db
        .select({ label: locationLabel, value: leadCount })
        .from(leads)
        .where(where)
        .groupBy(locationLabel)
        .orderBy(desc(leadCount))
        .limit(10),
    ]);

    return {
      interestReport: interestRows.map((row) => ({
        label: row.label,
        value: Number(row.value),
      })),
      locationReport: locationRows.map((row) => ({
        label: row.label,
        value: Number(row.value),
      })),
    };
  }

export async function getCampaignReport(this: LeadStorage, getDatabase: () => DatabaseExecutor, ) {
    const db = getDatabase();
    const rows = await db
      .select({
        provider: adCampaignMetrics.provider,
        campaignId: adCampaignMetrics.campaignId,
        campaignName: sql<string>`(
          array_agg(${adCampaignMetrics.campaignName} order by ${adCampaignMetrics.date} desc, ${adCampaignMetrics.createdAt} desc)
        )[1]`,
        spend: sql<string>`coalesce(sum(${adCampaignMetrics.spend}), 0)`,
        clicks: sql<number>`coalesce(sum(${adCampaignMetrics.clicks}), 0)`,
        impressions: sql<number>`coalesce(sum(${adCampaignMetrics.impressions}), 0)`,
        leads: sql<number>`coalesce(sum(${adCampaignMetrics.leads}), 0)`,
        conversions: sql<number>`coalesce(sum(${adCampaignMetrics.conversions}), 0)`,
      })
      .from(adCampaignMetrics)
      .groupBy(adCampaignMetrics.provider, adCampaignMetrics.campaignId);

    return rows
      .map<CampaignReportItem>((row) => {
        const spend = Number(row.spend);
        const leadCount = Number(row.leads);
        return {
          provider: row.provider,
          campaignId: row.campaignId,
          campaignName: row.campaignName,
          spend: formatSpend(spend),
          clicks: Number(row.clicks),
          impressions: Number(row.impressions),
          leads: leadCount,
          conversions: Number(row.conversions),
          costPerLead: leadCount > 0 ? formatSpend(spend / leadCount) : "0.00",
        };
      })
      .sort((left, right) => Number(right.spend) - Number(left.spend));
  }

export async function countGoogleAdsCampaignLeads(this: LeadStorage, getDatabase: () => DatabaseExecutor, input: { campaignId: string; campaignName: string }) {
    const db = getDatabase();
    const campaignId = input.campaignId.trim();
    const campaignName = input.campaignName.trim();
    const matches: SQL[] = [];

    if (campaignId) {
      matches.push(eq(leads.googleCampaignId, campaignId));
    }
    if (campaignName) {
      const pattern = `%${campaignName}%`;
      matches.push(
        ilike(leads.utmCampaign, pattern),
        ilike(leads.utmContent, pattern),
        ilike(leads.utmSource, pattern),
        ilike(leads.utmMedium, pattern),
        ilike(leads.utmTerm, pattern),
      );
    }
    if (matches.length === 0) {
      return 0;
    }

    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(and(isNull(leads.deletedAt), or(...matches)));

    return Number(row?.count ?? 0);
  }
