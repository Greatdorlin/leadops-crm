import { and, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import type { DatabaseExecutor } from "@/lib/db/client";
import { adCampaignMetrics, leads } from "@/lib/db/schema";
import type {
  CampaignReportItem,
  LeadDistributionReport,
  LeadListFilters,
  LeadStorage,
  SourceReportItem,
} from "./types";
import { formatSpend } from "./values";
import { buildLeadListConditions } from "./filters";

export async function getSourceReport(
  this: LeadStorage,
  getDatabase: () => DatabaseExecutor,
  filters: LeadListFilters = {},
) {
  const db = getDatabase();
  const conditions = buildLeadListConditions({
    ...filters,
    recordState: "active",
  });
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

export async function getLeadDistributionReport(
  this: LeadStorage,
  getDatabase: () => DatabaseExecutor,
  filters: LeadListFilters = {},
): Promise<LeadDistributionReport> {
  const db = getDatabase();
  const conditions = buildLeadListConditions(filters);
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  // Source tags and campaign names are acquisition metadata, not customer needs.
  const interestLabel = sql<string>`coalesce((
    select nullif(trim(v.display_value), '')
    from lead_custom_field_values v
    join custom_fields f on f.id = v.custom_field_id
    where v.lead_id = ${sql.raw('"leads"."id"')} and f.archived = false
      and (lower(f.key) in ('interest', 'interest_label', 'lead_interest', 'offer_interest', 'property_type', 'coverage_type', 'program_interest', 'service_type') or lower(f.label) = 'interest')
    order by f.sort_order, f.id limit 1
  ), 'Not recorded')`;
  const locationLabel = sql<string>`initcap(coalesce(
      nullif(trim(coalesce(${leads.city}, '')), ''),
      nullif(trim(coalesce(${leads.state}, '')), ''),
      nullif(trim(coalesce(${leads.region}, '')), ''),
      nullif(trim(coalesce(${leads.country}, '')), ''),
      'Not recorded'
    ))`;
  const leadCount = sql<number>`count(*)`;

  const interestGroups = db.select({label:interestLabel.as("label")}).from(leads).where(where).as("interest_groups");
  const locationGroups = db.select({label:locationLabel.as("label")}).from(leads).where(where).as("location_groups");
  const [interestRows, locationRows] = await Promise.all([
    db.select({label:interestGroups.label,value:leadCount}).from(interestGroups)
      .groupBy(interestGroups.label).orderBy(desc(leadCount),interestGroups.label).limit(10),
    db.select({label:locationGroups.label,value:leadCount}).from(locationGroups)
      .groupBy(locationGroups.label).orderBy(desc(leadCount),locationGroups.label).limit(10),
  ]);

  return {
    interestReport: interestRows.filter(row => row.label !== "Not recorded").map((row) => ({
      label: row.label,
      value: Number(row.value),
    })),
    locationReport: locationRows.filter(row => row.label !== "Not Recorded").map((row) => ({
      label: row.label,
      value: Number(row.value),
    })),
  };
}

export async function getCampaignReport(
  this: LeadStorage,
  getDatabase: () => DatabaseExecutor,
) {
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

export async function countGoogleAdsCampaignLeads(
  this: LeadStorage,
  getDatabase: () => DatabaseExecutor,
  input: { campaignId: string; campaignName: string },
) {
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
