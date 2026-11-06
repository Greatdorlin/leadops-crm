import { NextResponse } from "next/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import {
  assistantChanges,
  assistantClients,
  assistantCodes,
  assistantMembers,
  assistantSettings,
  assistantTokens,
  workspaceAuditLogs,
} from "@/lib/db/schema";
import { leadStore } from "@/lib/storage";
import {
  actorLabel,
  isAssistantOwner,
  sessionActor,
  workspaceAssistant,
} from "@/lib/assistant/access";
import { AssistantError, nameSchema } from "@/lib/assistant/contracts";
import { setWorkspaceAssistantEnabled } from "@/lib/assistant/management";
import { body, failure, sameOrigin, origin } from "@/lib/assistant/http";
import {
  approveChange,
  pendingChanges,
  performance,
  proposeChange,
  searchLeads,
} from "@/lib/assistant/tools";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const actor = await sessionActor(false);
    const db = getDb();
    const connections = await db
      .select({
        familyId: assistantTokens.familyId,
        clientName: assistantClients.name,
        clientId: assistantTokens.clientId,
        expiresAt: assistantTokens.refreshExpiresAt,
      })
      .from(assistantTokens)
      .innerJoin(
        assistantClients,
        eq(assistantTokens.clientId, assistantClients.id),
      )
      .where(
        and(
          eq(assistantTokens.userId, actor.user.id),
          isNull(assistantTokens.revokedAt),
        ),
      )
      .orderBy(desc(assistantTokens.expiresAt))
      .limit(30);
    return NextResponse.json(
      {
        name: await actorLabel(actor),
        workspace: await workspaceAssistant(),
        personalName: actor.member?.personalName ?? "",
        showLauncher: actor.member?.showLauncher ?? true,
        enabled: actor.enabled,
        canWrite: actor.canWrite,
        owner: actor.owner,
        currentUserId: actor.user.id,
        mcpUrl: `${origin()}/api/mcp`,
        pending: actor.enabled ? await pendingChanges(actor) : [],
        connections,
        ...(actor.owner
          ? {
              members: (await leadStore.listCrmUsers())
                .filter((u) => !isAssistantOwner(u))
                .map((u) => ({
                  id: u.id,
                  name: u.fullName ? `${u.fullName} · ${u.email}` : u.email,
                  isActive: u.isActive,
                })),
              grants: await db.select().from(assistantMembers),
            }
          : {}),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const raw = await body(request);
    const actor = await sessionActor(false);
    const db = getDb();
    if (raw.op === "workspace_enabled") {
      await setWorkspaceAssistantEnabled(
        actor.user.id,
        z.boolean().parse(raw.enabled),
      );
    } else if (raw.op === "launcher") {
      const showLauncher = z.boolean().parse(raw.showLauncher);
      await db
        .insert(assistantMembers)
        .values({ userId: actor.user.id, showLauncher })
        .onConflictDoUpdate({
          target: assistantMembers.userId,
          set: { showLauncher, updatedAt: new Date() },
        });
    } else if (raw.op === "personal_name") {
      const workspace = await workspaceAssistant();
      if (workspace.nameLocked)
        throw new AssistantError(
          "The owner has set one assistant name for everyone.",
          409,
        );
      const name = raw.name === "" ? null : nameSchema.parse(raw.name);
      await db
        .insert(assistantMembers)
        .values({ userId: actor.user.id, personalName: name })
        .onConflictDoUpdate({
          target: assistantMembers.userId,
          set: { personalName: name, updatedAt: new Date() },
        });
    } else if (raw.op === "workspace_name") {
      if (!actor.owner)
        throw new AssistantError(
          "Only the workspace owner can change this.",
          403,
        );
      const value = z
        .object({ name: nameSchema, nameLocked: z.boolean() })
        .parse(raw);
      await db
        .insert(assistantSettings)
        .values({ id: "workspace", ...value })
        .onConflictDoUpdate({ target: assistantSettings.id, set: value });
      await db.insert(workspaceAuditLogs).values({
        eventType: "assistant.name.updated",
        actorUserId: actor.user.id,
        actorEmail: actor.user.email,
        targetType: "assistant",
        details: value,
      });
    } else if (raw.op === "grant") {
      if (!actor.owner)
        throw new AssistantError(
          "Only the workspace owner can grant access.",
          403,
        );
      const value = z
        .object({
          userId: z.string().uuid(),
          enabled: z.boolean(),
          canWrite: z.boolean(),
        })
        .parse(raw);
      const target = await leadStore.getCrmUserById(value.userId);
      if (!target?.isActive)
        throw new AssistantError("Choose an active workspace member.");
      if (isAssistantOwner(target))
        throw new AssistantError(
          "Owners retain owner access. Manage their CRM role to change ownership.",
          409,
        );
      await db.transaction(async (tx) => {
        await tx
          .insert(assistantMembers)
          .values({
            ...value,
            canWrite: value.enabled && value.canWrite,
            generation: 1,
          })
          .onConflictDoUpdate({
            target: assistantMembers.userId,
            set: {
              enabled: value.enabled,
              canWrite: value.enabled && value.canWrite,
              generation: sql`${assistantMembers.generation}+1`,
              updatedAt: new Date(),
            },
          });
        await tx
          .update(assistantTokens)
          .set({ revokedAt: new Date() })
          .where(eq(assistantTokens.userId, value.userId));
        await tx
          .delete(assistantCodes)
          .where(eq(assistantCodes.userId, value.userId));
        await tx
          .update(assistantChanges)
          .set({ status: "rejected" })
          .where(
            and(
              eq(assistantChanges.userId, value.userId),
              eq(assistantChanges.status, "pending"),
            ),
          );
        await tx.insert(workspaceAuditLogs).values({
          eventType: "assistant.access.updated",
          actorUserId: actor.user.id,
          actorEmail: actor.user.email,
          targetType: "crm_user",
          targetId: value.userId,
          details: { enabled: value.enabled, canWrite: value.canWrite },
        });
      });
    } else if (raw.op === "disconnect") {
      const familyId = z.string().uuid().parse(raw.familyId);
      await db
        .update(assistantTokens)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(assistantTokens.userId, actor.user.id),
            eq(assistantTokens.familyId, familyId),
          ),
        );
    } else {
      if (!actor.enabled)
        throw new AssistantError(
          "Ask the owner to grant assistant access.",
          403,
        );
      if (raw.op === "performance")
        return NextResponse.json({
          kind: "performance",
          data: await performance(actor),
        });
      if (raw.op === "search")
        return NextResponse.json({
          kind: "leads",
          leads: await searchLeads(
            actor,
            z.string().trim().min(1).max(200).parse(raw.query),
          ),
        });
      if (raw.op === "propose")
        return NextResponse.json(await proposeChange(actor, raw.payload));
      if (raw.op === "review")
        return NextResponse.json(
          await approveChange(
            actor,
            z.string().uuid().parse(raw.id),
            z.boolean().parse(raw.approve),
          ),
        );
      throw new AssistantError("Choose an available assistant action.");
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
