import { formatLeadInterestLabel } from "@/lib/crm/labels";
import type { LeadRecord } from "@/lib/crm/types";

function payloadString(payload: Record<string, unknown> | null, keys: string[]) {
  if (!payload) {
    return null;
  }

  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

export function buildLeadAttributionSummary(lead: LeadRecord) {
  const routeId = payloadString(lead.sourcePayload, ["routeId", "route_id"]);

  return {
    source: lead.source,
    sourceDetail: lead.sourceDetail,
    routeId: routeId ?? (lead.source === "website_form" ? lead.sourceDetail : null),
    routeLabel:
      payloadString(lead.sourcePayload, ["routeLabel", "route_label"]) ??
      formatLeadInterestLabel(lead) ??
      null,
    formType: payloadString(lead.sourcePayload, ["formType", "form_type"]),
    nigeriaState: payloadString(lead.sourcePayload, ["nigeriaState", "nigeria_state"]),
    campaignId: lead.facebookCampaignId ?? lead.googleCampaignId,
    adGroupId: lead.facebookAdsetId ?? lead.googleAdGroupId,
    adId: lead.facebookAdId ?? lead.googleAdId,
    utmSource: lead.utmSource,
    utmMedium: lead.utmMedium,
    utmCampaign: lead.utmCampaign,
    utmContent: lead.utmContent,
    utmTerm: lead.utmTerm,
    landingPage: lead.landingPage,
  };
}
