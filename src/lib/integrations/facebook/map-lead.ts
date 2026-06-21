import type { ExternalLeadUpsertInput } from "@/lib/storage/types";
import type { FacebookLeadPayload } from "./fetch-lead";

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function readFieldValue(fields: Map<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = fields.get(normalizeKey(key));
    if (value) {
      return value;
    }
  }

  return "";
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

export function mapFacebookLeadToExternalInput(lead: FacebookLeadPayload): ExternalLeadUpsertInput {
  const fieldMap = new Map(
    (lead.field_data ?? []).map((field) => [
      normalizeKey(field.name),
      field.values?.[0]?.trim() ?? "",
    ]),
  );

  const fullName =
    readFieldValue(fieldMap, ["full_name", "fullname", "name"]) ||
    `${readFieldValue(fieldMap, ["first_name", "firstname"])} ${readFieldValue(fieldMap, ["last_name", "lastname"])}`.trim();
  const split = splitName(fullName);
  return {
    source: "facebook_lead_ads",
    sourceDetail: lead.form_id ?? "facebook_lead_ads",
    externalLeadId: lead.id,
    externalFormId: lead.form_id ?? null,
    firstName: readFieldValue(fieldMap, ["first_name", "firstname"]) || split.firstName,
    lastName: readFieldValue(fieldMap, ["last_name", "lastname"]) || split.lastName,
    email: readFieldValue(fieldMap, ["email"]),
    whatsappNumber: readFieldValue(fieldMap, [
      "phone_number",
      "phone",
      "whatsapp",
      "whatsapp_number",
    ]),
    facebookLeadgenId: lead.id,
    facebookFormId: lead.form_id ?? null,
    facebookPageId: lead.page_id ?? null,
    facebookCampaignId: lead.campaign_id ?? null,
    facebookAdId: lead.ad_id ?? null,
    facebookAdsetId: lead.adgroup_id ?? null,
    sourcePayload: lead as unknown as Record<string, unknown>,
  };
}
