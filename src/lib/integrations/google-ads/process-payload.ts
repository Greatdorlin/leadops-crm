import { notifyCrmEvent } from "@/lib/crm/notifications";
import { leadEventTypes } from "@/lib/crm/lead-events";
import { leadStore } from "@/lib/storage";
import {
  type GoogleAdsLeadWebhookPayload,
  mapGoogleAdsLeadToExternalInput,
} from "./map-lead";

export async function processGoogleAdsPayload(
  payloadRecordId: string,
  payload: GoogleAdsLeadWebhookPayload,
) {
  try {
    if (payload.is_test) {
      await leadStore.markPayloadProcessed(payloadRecordId);
      return { processed: 0, skipped: true };
    }

    const result = await leadStore.upsertExternalLead(
      mapGoogleAdsLeadToExternalInput(payload),
    );

    await leadStore.addLeadEvent({
      leadId: result.lead.id,
      eventType: leadEventTypes.googleAdsLeadReceived,
      eventData: {
        externalLeadId: payload.lead_id ?? null,
        externalFormId: payload.form_id ?? null,
        campaignId: payload.campaign_id ?? null,
        campaignName: payload.campaign_name ?? null,
        adGroupId: payload.adgroup_id ?? null,
        adId: payload.creative_id ?? null,
        googleClickId: payload.gcl_id ?? null,
        createdTime: payload.created_time ?? null,
        created: result.created,
      },
    });

    await notifyCrmEvent("google_ads_lead_received", {
      leadId: result.lead.id,
      externalLeadId: payload.lead_id ?? null,
      externalFormId: payload.form_id ?? null,
      campaignId: payload.campaign_id ?? null,
      campaignName: payload.campaign_name ?? null,
      adGroupId: payload.adgroup_id ?? null,
      adId: payload.creative_id ?? null,
      googleClickId: payload.gcl_id ?? null,
      createdTime: payload.created_time ?? null,
      created: result.created,
    });

    await leadStore.markPayloadProcessed(payloadRecordId);
    return { processed: 1, skipped: false };
  } catch (error) {
    await leadStore.markPayloadFailed(
      payloadRecordId,
      error instanceof Error ? error.message : "Google Ads payload processing failed.",
    );
    throw error;
  }
}
