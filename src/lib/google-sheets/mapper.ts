import type { ExternalLeadUpsertInput } from "../storage/types";
import type { LeadRecord } from "../pathway-engine/types";
import {
  buildPublicAssessmentResult,
  getPublicReportMetadata,
  getPublicReportPrimaryPathway,
} from "../pathway-engine/report/public-report-payload";
import type { GoogleSheetsExportRow, GoogleSheetsPayload } from "./types";

export const CRM_GOOGLE_SHEETS_EXPORT_HEADERS = [
  "Created At",
  "Completed At",
  "Lead ID",
  "Report Token",
  "Source",
  "CRM Status",
  "Assigned To",
  "First Name",
  "Last Name",
  "Email",
  "WhatsApp Number",
  "State",
  "Primary Goal",
  "Top Pathway",
  "Readiness",
  "Campaign",
  "UTM Source",
  "UTM Medium",
  "UTM Campaign",
  "Notes Count",
  "Next Follow Up",
] as const;

export function mapLeadToGoogleSheets(record: LeadRecord): GoogleSheetsPayload {
  const publicReport =
    record.report
      ? buildPublicAssessmentResult({
          answers: record.answers,
          report: record.report,
          publicReport: record.publicReport,
        })
      : null;
  const metadata = publicReport ? getPublicReportMetadata(publicReport) : null;
  const primaryPathway = publicReport ? getPublicReportPrimaryPathway(publicReport) : "No ranked pathway";

  return {
    values: [
      record.createdAt,
      record.completedAt ?? "",
      metadata?.reportId ?? "",
      record.id,
      record.reportToken ?? "",
      record.completionStatus,
      record.crmStatus,
      record.answers.firstName,
      record.answers.lastName,
      record.answers.email,
      record.answers.whatsappNumber,
      record.state ?? record.answers.stateOfResidence ?? "",
      record.answers.primaryGoal ?? "",
      primaryPathway,
      metadata?.readinessLevel ?? "",
      record.report?.leadSegment ?? "",
      record.report?.blockers.map((item) => item.title).join(", ") ?? "",
      String(record.progressPercent),
      record.answers.wantsHumanSupport ? "Yes" : "No",
      record.answers.marketingConsent ? "Yes" : "No",
      record.answers.sendReportConsent ? "Yes" : "No",
    ],
  };
}

export function mapLeadToGoogleSheetsExportRow(input: {
  lead: LeadRecord;
  notesCount: number;
  nextFollowUp: string | null;
}): GoogleSheetsExportRow {
  const { lead, notesCount, nextFollowUp } = input;

  return {
    values: [
      lead.createdAt,
      lead.completedAt ?? "",
      lead.id,
      lead.reportToken ?? "",
      lead.source ?? "",
      lead.crmStatus,
      lead.assignedTo ?? "",
      lead.firstName,
      lead.lastName,
      lead.email,
      lead.whatsappNumber,
      lead.state ?? lead.answers.stateOfResidence ?? "",
      lead.primaryGoal ?? "",
      lead.topPathwayTitle ?? "",
      lead.readinessLevel ?? "",
      lead.facebookCampaignId ?? lead.googleCampaignId ?? lead.utmCampaign ?? "",
      lead.utmSource ?? "",
      lead.utmMedium ?? "",
      lead.utmCampaign ?? "",
      String(notesCount),
      nextFollowUp ?? "",
    ],
  };
}

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

export function mapGoogleSheetsRowToLeadImport(
  headers: string[],
  row: string[],
): ExternalLeadUpsertInput {
  const headerMap = new Map(headers.map((header, index) => [normalizeHeader(header), index]));
  const source = readMappedValue(headerMap, row, ["Source"]) || "google_sheets";
  const firstName = readMappedValue(headerMap, row, ["First Name", "firstName"]);
  const lastName = readMappedValue(headerMap, row, ["Last Name", "lastName"]);
  const email = readMappedValue(headerMap, row, ["Email"]);
  const whatsappNumber = readMappedValue(headerMap, row, ["WhatsApp Number", "Phone", "Whatsapp"]);
  const state = readMappedValue(headerMap, row, ["State", "Lead State", "Location State"]);
  const primaryGoal = readMappedValue(headerMap, row, ["Primary Goal"]);
  const crmStatus = readMappedValue(headerMap, row, ["CRM Status"]);
  const campaign = readMappedValue(headerMap, row, ["Campaign", "UTM Campaign"]);
  const utmSource = readMappedValue(headerMap, row, ["UTM Source"]);
  const utmMedium = readMappedValue(headerMap, row, ["UTM Medium"]);
  const utmCampaign = readMappedValue(headerMap, row, ["UTM Campaign", "Campaign"]);

  return {
    source: source === "google_sheets" ? "google_sheets" : "manual_entry",
    sourceDetail: "google_sheets_import",
    firstName,
    lastName,
    email,
    whatsappNumber,
    state,
    primaryGoal: primaryGoal ? (primaryGoal as LeadRecord["primaryGoal"]) : null,
    crmStatus: crmStatus ? (crmStatus as LeadRecord["crmStatus"]) : "new",
    topPathwayTitle: readMappedValue(headerMap, row, ["Top Pathway"]),
    readinessLevel: readMappedValue(headerMap, row, ["Readiness"]) as LeadRecord["readinessLevel"],
    googleCampaignId: campaign,
    utmSource,
    utmMedium,
    utmCampaign,
    sourcePayload: {
      importedFrom: "google_sheets",
      headers,
      row,
    },
  };
}
