import { normalizeEnvValue } from "@/lib/env-utils";
import { google } from "googleapis";
import { mapLeadToGoogleSheets } from "./mapper";
import type { LeadRecord, SyncStatus } from "../crm/types";

function getGoogleSheetsConfig() {
  return {
    spreadsheetId: normalizeEnvValue(process.env.GOOGLE_SHEETS_SPREADSHEET_ID),
    worksheetName: normalizeEnvValue(process.env.GOOGLE_SHEETS_WORKSHEET_NAME),
    clientEmail: normalizeEnvValue(process.env.GOOGLE_SHEETS_CLIENT_EMAIL),
    privateKey: normalizeEnvValue(process.env.GOOGLE_SHEETS_PRIVATE_KEY).replace(/\\n/g, "\n"),
  };
}

async function getSheetsClient() {
  const { clientEmail, privateKey } = getGoogleSheetsConfig();
  if (!clientEmail || !privateKey) {
    throw new Error("Google Sheets service account credentials are not configured.");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({
    version: "v4",
    auth,
  });
}

export function isGoogleSheetsConfigured() {
  const { spreadsheetId, worksheetName, clientEmail, privateKey } = getGoogleSheetsConfig();
  return Boolean(spreadsheetId && worksheetName && clientEmail && privateKey);
}

function worksheetRange(worksheetName: string, range: string) {
  return `'${worksheetName.replace(/'/g, "''")}'!${range}`;
}

async function getConfiguredWorksheet(sheets: Awaited<ReturnType<typeof getSheetsClient>>) {
  const { spreadsheetId, worksheetName } = getGoogleSheetsConfig();
  if (!spreadsheetId || !worksheetName) {
    throw new Error("Google Sheets spreadsheet configuration is missing.");
  }

  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "properties.title,sheets.properties(sheetId,title,gridProperties)",
  });
  const worksheet = response.data.sheets?.find(({ properties }) => properties?.title === worksheetName)?.properties;
  if (worksheet?.sheetId == null) {
    throw new Error("The configured worksheet tab was not found.");
  }

  return { spreadsheetId, title: response.data.properties?.title ?? "Configured spreadsheet", worksheet, sheetId: worksheet.sheetId };
}

export async function verifyGoogleSheetAccess() {
  const sheets = await getSheetsClient();
  const { spreadsheetId, title, worksheet } = await getConfiguredWorksheet(sheets);
  return { spreadsheetId, title, worksheetName: worksheet.title };
}

export async function readGoogleSheetRows(rangeOverride?: string) {
  const { spreadsheetId, worksheetName } = getGoogleSheetsConfig();
  if (!spreadsheetId || !worksheetName) {
    throw new Error("Google Sheets spreadsheet configuration is missing.");
  }

  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: rangeOverride ?? worksheetRange(worksheetName, "A:Z"),
  });

  return (response.data.values as string[][] | undefined) ?? [];
}

export async function replaceGoogleSheetRows(values: string[][]) {
  const sheets = await getSheetsClient();
  const { spreadsheetId, worksheet, sheetId } = await getConfiguredWorksheet(sheets);
  const gridRows = worksheet.gridProperties?.rowCount ?? 0;
  const gridColumns = worksheet.gridProperties?.columnCount ?? 0;
  const columns = values.reduce((max, row) => Math.max(max, row.length), 26);

  // A single batch either replaces the export or leaves the worksheet intact.
  // Explicit string values also keep imported lead text from becoming formulas.
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        ...(values.length > gridRows ? [{ appendDimension: { sheetId, dimension: "ROWS", length: values.length - gridRows } }] : []),
        ...(columns > gridColumns ? [{ appendDimension: { sheetId, dimension: "COLUMNS", length: columns - gridColumns } }] : []),
        {
          updateCells: {
            range: { sheetId, startColumnIndex: 0, endColumnIndex: columns },
            fields: "userEnteredValue",
            rows: values.map((row) => ({
              values: row.map((value) => ({ userEnteredValue: { stringValue: value } })),
            })),
          },
        },
      ],
    },
  });
}

export async function syncLeadToGoogleSheets(record: LeadRecord): Promise<SyncStatus> {
  const { spreadsheetId, worksheetName } = getGoogleSheetsConfig();
  const attemptedAt = new Date().toISOString();

  if (!isGoogleSheetsConfigured()) {
    return {
      status: "not_configured",
      message: "Google Sheets service account credentials are not configured.",
      lastAttemptAt: attemptedAt,
      syncedAt: null,
    };
  }

  try {
    const sheets = await getSheetsClient();

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: worksheetRange(worksheetName, "A:T"),
      valueInputOption: "RAW",
      requestBody: {
        values: [mapLeadToGoogleSheets(record).values],
      },
    });

    return {
      status: "success",
      message: "Lead synced to Google Sheets.",
      lastAttemptAt: attemptedAt,
      syncedAt: attemptedAt,
    };
  } catch (error) {
    return {
      status: "failed",
      message:
        error instanceof Error
          ? `Google Sheets sync failed: ${error.message}`
          : "Google Sheets sync failed.",
      lastAttemptAt: attemptedAt,
      syncedAt: null,
    };
  }
}
