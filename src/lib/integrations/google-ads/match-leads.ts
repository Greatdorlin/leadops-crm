import type { LeadRecord } from "@/lib/crm/types";

export interface GoogleAdsMatchInput {
  campaignId: string;
  campaignName: string;
}

export function countMatchedLeadsForCampaign(
  leads: LeadRecord[],
  input: GoogleAdsMatchInput,
) {
  const campaignNeedle = input.campaignName.trim().toLowerCase();

  return leads.filter((lead) => {
    if (lead.googleCampaignId && lead.googleCampaignId === input.campaignId) {
      return true;
    }

    return [
      lead.utmCampaign,
      lead.utmContent,
      lead.utmSource,
      lead.utmMedium,
      lead.utmTerm,
    ]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(campaignNeedle));
  }).length;
}
