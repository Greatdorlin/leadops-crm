import type { ExternalLeadUpsertInput } from "@/lib/storage/types";
import {
  normalizeIntegrationFieldKey,
  readIntegrationFieldValue,
  splitIntegrationFullName,
} from "@/lib/integrations/shared/field-map";

interface GoogleAdsColumnField {
  column_id?: string;
  column_name?: string;
  string_value?: string;
}

export interface GoogleAdsLeadWebhookPayload {
  lead_id?: string;
  form_id?: string;
  form_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  adgroup_id?: string;
  adgroup_name?: string;
  creative_id?: string;
  creative_name?: string;
  gcl_id?: string;
  created_time?: string;
  is_test?: boolean;
  user_column_data?: GoogleAdsColumnField[];
  [key: string]: unknown;
}

function buildFieldMap(payload: GoogleAdsLeadWebhookPayload) {
  return new Map(
    (payload.user_column_data ?? [])
      .flatMap((field) => {
        const value = field.string_value?.trim() ?? "";
        if (!value) {
          return [];
        }

        return [field.column_id, field.column_name]
          .filter((candidate): candidate is string => Boolean(candidate?.trim()))
          .map((candidate) => [normalizeIntegrationFieldKey(candidate), value] as const);
      }),
  );
}

export function mapGoogleAdsLeadToExternalInput(
  payload: GoogleAdsLeadWebhookPayload,
): ExternalLeadUpsertInput {
  const fields = buildFieldMap(payload);
  const fullName =
    readIntegrationFieldValue(fields, ["full_name", "name"]) ||
    `${readIntegrationFieldValue(fields, ["first_name", "given_name"])} ${readIntegrationFieldValue(fields, ["last_name", "family_name"])}`.trim();
  const splitName = splitIntegrationFullName(fullName);

  return {
    source: "google_ads",
    sourceDetail: payload.form_name ?? payload.form_id ?? payload.campaign_name ?? "google_ads",
    externalLeadId: payload.lead_id ?? null,
    externalFormId: payload.form_id ?? null,
    firstName:
      readIntegrationFieldValue(fields, ["first_name", "given_name"]) || splitName.firstName,
    lastName:
      readIntegrationFieldValue(fields, ["last_name", "family_name"]) || splitName.lastName,
    email: readIntegrationFieldValue(fields, ["email", "work_email"]),
    whatsappNumber: readIntegrationFieldValue(fields, [
      "phone_number",
      "phone",
      "mobile_phone_number",
      "whatsapp",
    ]),
    state: readIntegrationFieldValue(fields, ["state", "region", "state_of_residence"]),
    googleClickId: payload.gcl_id ?? null,
    googleCampaignId: payload.campaign_id ?? null,
    googleAdGroupId: payload.adgroup_id ?? null,
    googleAdId: payload.creative_id ?? null,
    sourcePayload: payload as Record<string, unknown>,
    answers: {
      stateOfResidence:
        readIntegrationFieldValue(fields, ["state", "region", "state_of_residence"]) || null,
      timeline:
        readIntegrationFieldValue(fields, ["timeline", "purchase_timeline", "travel_timeline"]) ||
        null,
      destinationInterest:
        readIntegrationFieldValue(fields, [
          "destination",
          "destination_interest",
          "country_interest",
        ]) || null,
    },
  };
}
