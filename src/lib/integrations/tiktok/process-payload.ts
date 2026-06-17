import { notifyCrmEvent } from "@/lib/crm/notifications";
import { leadEventTypes } from "@/lib/crm/lead-events";
import { leadStore } from "@/lib/storage";
import { getTikTokLeadAttribution, mapTikTokLeadToExternalInput } from "./map-lead";

export async function processTikTokPayload(
  payloadRecordId: string,
  payload: Record<string, unknown>,
) {
  try {
    const attribution = getTikTokLeadAttribution(payload);
    const result = await leadStore.upsertExternalLead(
      mapTikTokLeadToExternalInput(payload),
    );

    await leadStore.addLeadEvent({
      leadId: result.lead.id,
      eventType: leadEventTypes.tiktokLeadReceived,
      eventData: {
        externalLeadId: attribution.leadId,
        externalFormId: attribution.formId,
        campaignId: attribution.campaignId,
        adGroupId: attribution.adGroupId,
        adId: attribution.adId,
        createdTime: attribution.createdTime,
        created: result.created,
      },
    });

    await notifyCrmEvent("tiktok_lead_received", {
      leadId: result.lead.id,
      externalLeadId: attribution.leadId,
      externalFormId: attribution.formId,
      campaignId: attribution.campaignId,
      adGroupId: attribution.adGroupId,
      adId: attribution.adId,
      createdTime: attribution.createdTime,
      created: result.created,
    });

    await leadStore.markPayloadProcessed(payloadRecordId);
    return { processed: 1 };
  } catch (error) {
    await leadStore.markPayloadFailed(
      payloadRecordId,
      error instanceof Error ? error.message : "TikTok payload processing failed.",
    );
    throw error;
  }
}
