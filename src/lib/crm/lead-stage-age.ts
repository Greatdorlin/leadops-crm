import { leadEventTypes } from "./lead-events";
import type { LeadEventRecord } from "./types";

export function getCurrentStageAge(
  stageId: string | null | undefined,
  events: ReadonlyArray<Pick<LeadEventRecord, "eventType" | "eventData" | "createdAt">>,
  now = new Date(),
) {
  if (!stageId) return null;

  let latest: { enteredAt: string; timestamp: number; target: string } | null = null;
  for (const event of events) {
    const data = event.eventData;
    const target = event.eventType === leadEventTypes.statusChanged
      ? data?.toStageId
      : event.eventType === "workspace_automation_applied" && data?.actionType === "set_stage" && data.before !== data.after
        ? data.after
        : null;
    if (typeof target !== "string") continue;

    const timestamp = Date.parse(event.createdAt);
    if (!Number.isFinite(timestamp) || timestamp > now.getTime()) continue;
    if (
      !latest ||
      timestamp > latest.timestamp ||
      (timestamp === latest.timestamp && target === stageId)
    ) {
      latest = { enteredAt: event.createdAt, timestamp, target };
    }
  }

  if (latest?.target !== stageId) return null;
  return {
    enteredAt: latest.enteredAt,
    days: Math.floor((now.getTime() - latest.timestamp) / 86_400_000),
  };
}
