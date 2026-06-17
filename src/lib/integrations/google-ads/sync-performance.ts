import { notifyCrmEvent } from "@/lib/crm/notifications";
import { leadStore } from "@/lib/storage";
import { fetchGoogleAdsCampaignMetrics } from "./client";
import { countMatchedLeadsForCampaign } from "./match-leads";

export async function syncGoogleAdsPerformance(dateFrom?: string, dateTo?: string) {
  const [batches, leads] = await Promise.all([
    fetchGoogleAdsCampaignMetrics(dateFrom, dateTo),
    leadStore.list(),
  ]);

  let stored = 0;

  for (const batch of batches) {
    for (const result of batch.results ?? []) {
      const matchedLeads = countMatchedLeadsForCampaign(leads, {
        campaignId: result.campaign?.id ?? "",
        campaignName: result.campaign?.name ?? "",
      });

      await leadStore.upsertAdCampaignMetric({
        provider: "google_ads",
        accountId: process.env.GOOGLE_ADS_CUSTOMER_ID ?? "",
        campaignId: result.campaign?.id ?? "",
        campaignName: result.campaign?.name ?? "",
        adGroupId: result.adGroup?.id ?? "",
        adGroupName: result.adGroup?.name ?? "",
        adId: result.adGroupAd?.ad?.id ?? "",
        adName: result.adGroupAd?.ad?.name ?? "",
        date: result.segments?.date ?? new Date().toISOString().slice(0, 10),
        impressions: Number(result.metrics?.impressions ?? 0),
        clicks: Number(result.metrics?.clicks ?? 0),
        spend: (
          Number(result.metrics?.costMicros ?? 0) / 1_000_000
        ).toFixed(2),
        leads: matchedLeads,
        conversions: Number(result.metrics?.conversions ?? 0),
        rawMetrics: result as unknown as Record<string, unknown>,
      });
      stored += 1;
    }
  }

  await notifyCrmEvent("google_ads_sync_completed", {
    stored,
  });

  return { stored };
}
