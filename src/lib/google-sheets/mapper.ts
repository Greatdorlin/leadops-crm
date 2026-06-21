import type { LeadRecord } from "../crm/types";
import type { ExternalLeadUpsertInput } from "../storage/types";
import type { GoogleSheetsExportRow, GoogleSheetsPayload } from "./types";

export const CRM_GOOGLE_SHEETS_EXPORT_HEADERS = [
  "Created At",
  "Lead ID",
  "Source",
  "Stage",
  "Owner",
  "First Name",
  "Last Name",
  "Email",
  "Phone",
  "Country",
  "Region",
  "City",
  "Address",
  "Postal Code",
  "Company",
  "Campaign",
  "Priority",
  "Estimated Value",
  "Expected Close Date",
  "Next Follow-up",
] as const;

function normalizeHeader(value: string) {
  return value.trim().toLowerCase();
}

function readMappedValue(headers: Map<string, number>, row: string[], names: string[]) {
  for (const name of names) {
    const index = headers.get(normalizeHeader(name));
    if (index !== undefined) {
      return row[index]?.trim() ?? "";
    }
  }

  return "";
}

export function mapLeadToGoogleSheets(record: LeadRecord): GoogleSheetsPayload {
  return {
    values: [
      record.createdAt,
      record.id,
      record.source ?? "",
      record.stageId ?? "",
      record.assignedTo ?? "",
      record.firstName ?? "",
      record.lastName ?? "",
      record.email ?? "",
      record.whatsappNumber ?? "",
      record.country ?? "",
      record.region ?? record.state ?? "",
      record.city ?? "",
      record.address ?? "",
      record.postalCode ?? "",
      record.companyName ?? "",
      record.campaignLabel ?? "",
      record.priority,
      record.estimatedValue ? String(record.estimatedValue) : "",
      record.expectedCloseDate ?? "",
      record.nextFollowUpAt ?? "",
    ],
  };
}

export function mapLeadToGoogleSheetsExportRow(input: {
  lead: LeadRecord;
  notesCount: number;
  nextFollowUp: string | null;
}): GoogleSheetsExportRow {
  return {
    values: mapLeadToGoogleSheets(input.lead).values,
  };
}

export function mapGoogleSheetsRowToLeadImport(
  headers: string[],
  row: string[],
): ExternalLeadUpsertInput {
  const headerMap = new Map(headers.map((header, index) => [normalizeHeader(header), index]));
  const source = readMappedValue(headerMap, row, ["Source"]) || "google_sheets";

  return {
    source: source === "google_sheets" ? "google_sheets" : "manual_entry",
    sourceDetail: "google_sheets_import",
    firstName: readMappedValue(headerMap, row, ["First Name", "Name", "Lead Name"]) || null,
    lastName: readMappedValue(headerMap, row, ["Last Name"]) || null,
    email: readMappedValue(headerMap, row, ["Email"]) || null,
    whatsappNumber:
      readMappedValue(headerMap, row, ["WhatsApp Number", "Phone", "Whatsapp"]) || null,
    state: readMappedValue(headerMap, row, ["State"]) || null,
    country: readMappedValue(headerMap, row, ["Country"]) || null,
    region: readMappedValue(headerMap, row, ["Region", "State/Province/Region"]) || null,
    city: readMappedValue(headerMap, row, ["City"]) || null,
    address: readMappedValue(headerMap, row, ["Address"]) || null,
    postalCode: readMappedValue(headerMap, row, ["Postal Code", "PostalCode"]) || null,
    companyName: readMappedValue(headerMap, row, ["Company", "Company Name"]) || null,
    campaignLabel: readMappedValue(headerMap, row, ["Campaign", "Campaign Label"]) || null,
    sourcePayload: {
      importedFrom: "google_sheets",
      headers,
      row,
    },
  };
}
