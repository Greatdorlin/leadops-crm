import { normalizeText } from "@/lib/crm/value-normalization";
import { leads } from "@/lib/db/schema";
import { parseNigeriaStateValue } from "@/lib/nigeria-state-options";
import type { LeadRecord, SyncStatus } from "@/lib/crm/types";

export function defaultSyncState(
  message: string,
): LeadRecord["sync"]["sender"] {
  return {
    status: "pending",
    message,
    lastAttemptAt: null,
    syncedAt: null,
  };
}

export function retiredGoogleSheetsSyncState(): SyncStatus {
  return {
    status: "skipped",
    message: "Google Sheets sync retired. Use the CRM export instead.",
    lastAttemptAt: null,
    syncedAt: null,
  };
}

export function defaultSyncMetadata(message = "Lead captured. Sync pending.") {
  return {
    googleSheets: retiredGoogleSheetsSyncState(),
    sender: defaultSyncState(message),
  };
}

export function toIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

export function startOfDay(base = new Date()) {
  const day = new Date(base);
  day.setHours(0, 0, 0, 0);
  return day;
}

export function endOfDay(base = new Date()) {
  const day = new Date(base);
  day.setHours(23, 59, 59, 999);
  return day;
}

export function formatSpend(value: string | number | null | undefined) {
  const numericValue =
    typeof value === "number" ? value : Number.parseFloat(value ?? "0");
  return Number.isFinite(numericValue) ? numericValue.toFixed(2) : "0.00";
}

export function parseOptionalNumeric(value?: string | number | null) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeLeadRegion(value?: string | null) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return parseNigeriaStateValue(value) ?? normalizeText(value);
}

export function deriveCompatibilityStatus(
  row: typeof leads.$inferSelect,
): LeadRecord["crmStatus"] {
  if (row.wonAt) {
    return "converted";
  }

  if (row.lostAt) {
    return "lost";
  }

  if (row.stageId || row.assignedTo || row.nextFollowUpAt) {
    return "contacted";
  }

  return "new";
}
