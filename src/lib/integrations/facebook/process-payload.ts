import { notifyCrmEvent } from "@/lib/crm/notifications";
import { leadEventTypes } from "@/lib/crm/lead-events";
import { leadStore } from "@/lib/storage";
import { fetchFacebookLead } from "./fetch-lead";
import { mapFacebookLeadToExternalInput } from "./map-lead";

interface FacebookWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: {
        leadgen_id?: string;
        form_id?: string;
        page_id?: string;
        ad_id?: string;
        adgroup_id?: string;
        campaign_id?: string;
      };
    }>;
  }>;
}

function extractLeadgenIds(payload: FacebookWebhookPayload) {
  return (payload.entry ?? [])
    .flatMap((entry) => entry.changes ?? [])
    .filter((change) => change.field === "leadgen")
    .map((change) => change.value?.leadgen_id)
    .filter((value): value is string => Boolean(value));
}

export async function processFacebookPayload(payloadRecordId: string, payload: FacebookWebhookPayload) {
  const leadgenIds = extractLeadgenIds(payload);
  if (leadgenIds.length === 0) {
    await leadStore.markPayloadProcessed(payloadRecordId);
    return {
      processed: 0,
    };
  }

  try {
    let processed = 0;

    for (const leadgenId of leadgenIds) {
      const lead = await fetchFacebookLead(leadgenId);
      const result = await leadStore.upsertExternalLead(mapFacebookLeadToExternalInput(lead));
      await leadStore.addLeadEvent({
        leadId: result.lead.id,
        eventType: leadEventTypes.facebookLeadReceived,
        eventData: {
          leadgenId,
          created: result.created,
        },
      });
      await notifyCrmEvent("facebook_lead_received", {
        leadId: result.lead.id,
        leadgenId,
        created: result.created,
      });
      processed += 1;
    }

    await leadStore.markPayloadProcessed(payloadRecordId);
    return { processed };
  } catch (error) {
    await leadStore.markPayloadFailed(
      payloadRecordId,
      error instanceof Error ? error.message : "Facebook payload processing failed.",
    );
    throw error;
  }
}
