import type { ExternalLeadUpsertInput } from "@/lib/storage/types";
import {
  normalizeIntegrationFieldKey,
  readIntegrationFieldValue,
  splitIntegrationFullName,
} from "@/lib/integrations/shared/field-map";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function getTikTokLeadAttribution(payload: UnknownRecord) {
  const payloadData = asRecord(payload.data) ?? {};
  const leadRecord = asRecord(payload.lead) ?? {};

  return {
    leadId:
      asString(payload.lead_id) ||
      asString(payloadData.lead_id) ||
      asString(leadRecord.id) ||
      asString(leadRecord.lead_id) ||
      null,
    formId:
      asString(payload.form_id) ||
      asString(payloadData.form_id) ||
      asString(leadRecord.form_id) ||
      null,
    campaignId:
      asString(payload.campaign_id) ||
      asString(payloadData.campaign_id) ||
      asString(leadRecord.campaign_id) ||
      null,
    adGroupId:
      asString(payload.adgroup_id) ||
      asString(payloadData.adgroup_id) ||
      asString(leadRecord.adgroup_id) ||
      null,
    adId:
      asString(payload.ad_id) ||
      asString(payloadData.ad_id) ||
      asString(leadRecord.ad_id) ||
      null,
    createdTime:
      asString(payload.created_time) ||
      asString(payloadData.created_time) ||
      asString(leadRecord.created_time) ||
      null,
  };
}

function buildFieldMap(payload: UnknownRecord) {
  // TikTok's lead delivery payload can differ by surface and account setup.
  // We support both the common top-level shape and nested `data` / `lead`
  // objects, while treating `field_data` / `answers` as the canonical source
  // for submitted lead form values.
  const possibleCollections = [
    payload.field_data,
    payload.answers,
    asRecord(payload.data)?.field_data,
    asRecord(payload.data)?.answers,
    asRecord(payload.lead)?.field_data,
    asRecord(payload.lead)?.answers,
  ];

  const entries: Array<readonly [string, string]> = [];

  for (const collection of possibleCollections) {
    if (!Array.isArray(collection)) {
      continue;
    }

    for (const item of collection) {
      const record = asRecord(item);
      if (!record) {
        continue;
      }

      const value =
        asString(record.value) ||
        asString(record.answer) ||
        asString(record.text) ||
        (Array.isArray(record.values)
          ? record.values.map((entry) => asString(entry)).filter(Boolean).join(", ")
          : "");

      if (!value) {
        continue;
      }

      for (const candidate of [
        record.name,
        record.label,
        record.key,
        record.question_key,
        record.field_name,
      ]) {
        const fieldName = asString(candidate);
        if (fieldName) {
          entries.push([normalizeIntegrationFieldKey(fieldName), value] as const);
        }
      }
    }
  }

  return new Map(entries);
}

export function mapTikTokLeadToExternalInput(payload: UnknownRecord): ExternalLeadUpsertInput {
  const fields = buildFieldMap(payload);
  const attribution = getTikTokLeadAttribution(payload);
  const fullName =
    readIntegrationFieldValue(fields, ["full_name", "name"]) ||
    `${readIntegrationFieldValue(fields, ["first_name", "firstname"])} ${readIntegrationFieldValue(fields, ["last_name", "lastname"])}`.trim();
  const splitName = splitIntegrationFullName(fullName);

  return {
    source: "tiktok_lead_ads",
    sourceDetail: attribution.formId || "tiktok_lead_ads",
    externalLeadId: attribution.leadId,
    externalFormId: attribution.formId,
    firstName:
      readIntegrationFieldValue(fields, ["first_name", "firstname"]) || splitName.firstName,
    lastName:
      readIntegrationFieldValue(fields, ["last_name", "lastname"]) || splitName.lastName,
    email: readIntegrationFieldValue(fields, ["email", "work_email"]),
    whatsappNumber: readIntegrationFieldValue(fields, [
      "phone_number",
      "phone",
      "mobile",
      "whatsapp",
      "whatsapp_number",
    ]),
    state: readIntegrationFieldValue(fields, ["state", "region", "state_of_residence"]),
    sourcePayload: payload,
  };
}
