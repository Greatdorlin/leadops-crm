import { mapLeadToSender } from "./mapper";
import type { LeadRecord, SyncStatus } from "../pathway-engine/types";

export async function syncLeadToSender(record: LeadRecord): Promise<SyncStatus> {
  const apiKey = process.env.SENDER_API_KEY;
  const defaultGroupId = process.env.SENDER_DEFAULT_GROUP_ID ?? "";
  const attemptedAt = new Date().toISOString();

  if (record.completionStatus !== "complete" || !record.report) {
    return {
      status: "skipped",
      message: "Only completed leads can be synced to Sender.",
      lastAttemptAt: attemptedAt,
      syncedAt: null,
    };
  }

  if (!apiKey || !defaultGroupId) {
    return {
      status: "not_configured",
      message: "Sender credentials are not configured.",
      lastAttemptAt: attemptedAt,
      syncedAt: null,
    };
  }

  if (!record.answers.marketingConsent) {
    return {
      status: "skipped",
      message: "Marketing consent was not granted for Sender sync.",
      lastAttemptAt: attemptedAt,
      syncedAt: null,
    };
  }

  try {
    const response = await fetch("https://api.sender.net/v2/subscribers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mapLeadToSender(record, defaultGroupId)),
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        status: "failed",
        message: `Sender responded with ${response.status}.`,
        lastAttemptAt: attemptedAt,
        syncedAt: null,
      };
    }

    return {
      status: "success",
      message: "Completed lead synced to Sender.",
      lastAttemptAt: attemptedAt,
      syncedAt: attemptedAt,
    };
  } catch {
    return {
      status: "failed",
      message: "Unable to reach Sender.",
      lastAttemptAt: attemptedAt,
      syncedAt: null,
    };
  }
}
