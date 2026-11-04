import { getDb } from "@/lib/db/client";
import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageAdminSettings } from "@/lib/crm/authz";
import {
  createWorkspaceAutomation,
  listWorkspaceAutomations,
  workspaceAutomationPayloadSchema,
} from "@/lib/crm/workspace-automations";
import { recordWorkspaceAuditEvent } from "@/lib/crm/workspace-audit";

export async function GET() {
  const context = await getAdminRequestContext();
  if (!context) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!canManageAdminSettings(context)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  return NextResponse.json({ rules: await listWorkspaceAutomations() });
}

export async function POST(request: Request) {
  const context = await getAdminRequestContext();
  const actorEmail = context?.session.user?.email;
  if (!context || !actorEmail) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!canManageAdminSettings(context)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const parsed = workspaceAutomationPayloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid automation." }, { status: 400 });
  try {
    const rule = await getDb().transaction(async (transaction) => {
      const created = await createWorkspaceAutomation(parsed.data, actorEmail, transaction);
      await recordWorkspaceAuditEvent({
        eventType: "workspace.automation_created",
        actorEmail,
        actorUserId: context.crmUser?.id,
        targetType: "workspace_automation",
        targetId: created.id,
        details: {
          name: created.name,
          conditionField: created.conditionField,
          actionType: created.actionType,
          isActive: created.isActive,
        },
      }, transaction);
      return created;
    });
    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    console.error("[workspace-automation:create]", error);
    return NextResponse.json({ error: "We couldn't save this automation. Try again." }, { status: 500 });
  }
}
