import { google } from "googleapis";
import { mapLeadToGoogleSheets } from "./mapper";
import type { LeadRecord, SyncStatus } from "../crm/types";

function getGoogleSheetsConfig() {
  return {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
    worksheetName: process.env.GOOGLE_SHEETS_WORKSHEET_NAME,
    clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n"),
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

export async function verifyGoogleSheetAccess() {
  const { spreadsheetId } = getGoogleSheetsConfig();
  if (!spreadsheetId) {
    throw new Error("The spreadsheet ID is not configured.");
  }

  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "spreadsheetId,properties.title",
  });

  return {
    spreadsheetId: response.data.spreadsheetId ?? spreadsheetId,
    title: response.data.properties?.title ?? "Configured spreadsheet",
  };
}

export async function readGoogleSheetRows(rangeOverride?: string) {
  const { spreadsheetId, worksheetName } = getGoogleSheetsConfig();
  if (!spreadsheetId || !worksheetName) {
    throw new Error("Google Sheets spreadsheet configuration is missing.");
  }

  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: rangeOverride ?? `${worksheetName}!A:Z`,
  });

  return (response.data.values as string[][] | undefined) ?? [];
}

export async function replaceGoogleSheetRows(values: string[][], rangeOverride?: string) {
  const { spreadsheetId, worksheetName } = getGoogleSheetsConfig();
  if (!spreadsheetId || !worksheetName) {
    throw new Error("Google Sheets spreadsheet configuration is missing.");
  }

  const sheets = await getSheetsClient();
  const range = rangeOverride ?? `${worksheetName}!A:Z`;

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values,
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
      range: `${worksheetName}!A:T`,
      valueInputOption: "USER_ENTERED",
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
