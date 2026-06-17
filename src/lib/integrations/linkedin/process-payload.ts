import { notifyCrmEvent } from "@/lib/crm/notifications";
import { leadEventTypes } from "@/lib/crm/lead-events";
import { leadStore } from "@/lib/storage";
import { fetchLinkedInLeadFormResponse, parseLinkedInUrnId } from "./client";
import { mapLinkedInLeadToExternalInput } from "./map-lead";

interface LinkedInLeadNotification {
  type?: string;
  id?: string;
  leadAction?: string;
  leadGenFormResponse?: string;
}

function extractNotifications(payload: Record<string, unknown>) {
  if (Array.isArray(payload.elements)) {
    return payload.elements.filter(
      (entry): entry is LinkedInLeadNotification =>
        Boolean(entry && typeof entry === "object"),
    );
  }

  return [payload as LinkedInLeadNotification];
}

export async function processLinkedInPayload(
  payloadRecordId: string,
  payload: Record<string, unknown>,
) {
  const notifications = extractNotifications(payload);

  try {
    let processed = 0;

    for (const notification of notifications) {
      if (notification.type !== "LEAD_ACTION" || notification.leadAction !== "CREATED") {
        continue;
      }

      const response = await fetchLinkedInLeadFormResponse(
        notification.leadGenFormResponse ?? "",
      );

      if (response.testLead) {
        continue;
      }

      const result = await leadStore.upsertExternalLead(
        mapLinkedInLeadToExternalInput(response),
      );

      await leadStore.addLeadEvent({
        leadId: result.lead.id,
        eventType: leadEventTypes.linkedinLeadReceived,
        eventData: {
          notificationId: notification.id ?? null,
          externalLeadId: result.lead.externalLeadId,
          externalFormId: response.form?.id ?? null,
          campaignId:
            parseLinkedInUrnId(
              response.leadMetadataInfo?.sponsoredLeadMetadataInfo?.campaign?.id ?? null,
            ) || null,
          campaignName:
            response.leadMetadataInfo?.sponsoredLeadMetadataInfo?.campaign?.name ?? null,
          creativeId:
            parseLinkedInUrnId(response.associatedEntityInfo?.associatedCreative?.id ?? null) ||
            null,
          accountId:
            parseLinkedInUrnId(
              response.ownerInfo?.sponsoredAccount ??
                response.owner?.sponsoredAccount ??
                response.ownerInfo?.organization ??
                response.owner?.organization ??
                null,
            ) || null,
          submittedAt:
            typeof response.submittedAt === "number" ? String(response.submittedAt) : null,
          created: result.created,
        },
      });

      await notifyCrmEvent("linkedin_lead_received", {
        leadId: result.lead.id,
        notificationId: notification.id ?? null,
        externalLeadId: result.lead.externalLeadId,
        externalFormId: response.form?.id ?? null,
        campaignId:
          parseLinkedInUrnId(
            response.leadMetadataInfo?.sponsoredLeadMetadataInfo?.campaign?.id ?? null,
          ) || null,
        campaignName: response.leadMetadataInfo?.sponsoredLeadMetadataInfo?.campaign?.name ?? null,
        creativeId:
          parseLinkedInUrnId(response.associatedEntityInfo?.associatedCreative?.id ?? null) ||
          null,
        accountId:
          parseLinkedInUrnId(
            response.ownerInfo?.sponsoredAccount ??
              response.owner?.sponsoredAccount ??
              response.ownerInfo?.organization ??
              response.owner?.organization ??
              null,
          ) || null,
        submittedAt: typeof response.submittedAt === "number" ? String(response.submittedAt) : null,
        created: result.created,
      });

      processed += 1;
    }

    await leadStore.markPayloadProcessed(payloadRecordId);
    return { processed };
  } catch (error) {
    await leadStore.markPayloadFailed(
      payloadRecordId,
      error instanceof Error ? error.message : "LinkedIn payload processing failed.",
    );
    throw error;
  }
}
