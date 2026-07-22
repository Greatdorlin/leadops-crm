import { getDb } from "@/lib/db/client";
import type { DatabaseExecutor } from "@/lib/db/client";
import { workspaceAuditLogs } from "@/lib/db/schema";

export async function recordWorkspaceAuditEvent(input: {
  eventType: string;
  actorEmail: string;
  actorUserId?: string | null;
  targetType: string;
  targetId?: string | null;
  details?: Record<string, unknown> | null;
}, executor: DatabaseExecutor = getDb()) {
  await executor.insert(workspaceAuditLogs).values({
    eventType: input.eventType,
    actorEmail: input.actorEmail.trim().toLowerCase(),
    actorUserId: input.actorUserId ?? null,
    targetType: input.targetType,
    targetId: input.targetId ?? null,
    details: input.details ?? null,
  });
}
