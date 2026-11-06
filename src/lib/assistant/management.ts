import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  assistantSettings,
  assistantTokens,
  assistantCodes,
  assistantChanges,
  workspaceAuditLogs,
} from "@/lib/db/schema";
import { actorForUser } from "./access";
import { AssistantError } from "./contracts";

export async function setWorkspaceAssistantEnabled(
  userId: string,
  enabled: boolean,
) {
  await getDb().transaction(async (tx) => {
    const actor = await actorForUser(userId, tx);
    if (!actor.owner)
      throw new AssistantError(
        "Only an owner can turn the workspace assistant on or off.",
        403,
      );
    await tx
      .insert(assistantSettings)
      .values({ id: "workspace", enabled })
      .onConflictDoUpdate({ target: assistantSettings.id, set: { enabled } });
    if (!enabled) {
      await tx.update(assistantTokens).set({ revokedAt: new Date() });
      await tx.delete(assistantCodes);
      await tx
        .update(assistantChanges)
        .set({ status: "rejected" })
        .where(eq(assistantChanges.status, "pending"));
    }
    await tx
      .insert(workspaceAuditLogs)
      .values({
        eventType: "assistant.availability.updated",
        actorUserId: actor.user.id,
        actorEmail: actor.user.email,
        targetType: "assistant",
        targetId: "workspace",
        details: { enabled },
      });
  });
}
