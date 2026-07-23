import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageAdminSettings } from "@/lib/crm/authz";
import {
  deleteWorkspaceAutomation,
  updateWorkspaceAutomation,
  workspaceAutomationPayloadSchema,
} from "@/lib/crm/workspace-automations";
import { recordWorkspaceAuditEvent } from "@/lib/crm/workspace-audit";

async function authorize() {
  const context = await getAdminRequestContext();
  if (!context) return { error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  if (!canManageAdminSettings(context)) return { error: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  return { context };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorize();
  if (auth.error) return auth.error;
  const parsed = workspaceAutomationPayloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid automation." }, { status: 400 });
  const { id } = await params;
  const rule = await updateWorkspaceAutomation(id, parsed.data);
  if (rule) {
    await recordWorkspaceAuditEvent({
      eventType: "workspace.automation_updated",
      actorEmail: auth.context.session.user?.email ?? "unknown",
      actorUserId: auth.context.crmUser?.id,
      targetType: "workspace_automation",
      targetId: rule.id,
      details: {
        name: rule.name,
        conditionField: rule.conditionField,
        actionType: rule.actionType,
        isActive: rule.isActive,
      },
    });
  }
  return rule ? NextResponse.json({ rule }) : NextResponse.json({ error: "Automation not found." }, { status: 404 });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorize();
  if (auth.error) return auth.error;
  const { id } = await params;
  const deleted = await deleteWorkspaceAutomation(id);
  if (!deleted) {
    return NextResponse.json({ error: "Automation not found." }, { status: 404 });
  }
  await recordWorkspaceAuditEvent({
    eventType: "workspace.automation_deleted",
    actorEmail: auth.context.session.user?.email ?? "unknown",
    actorUserId: auth.context.crmUser?.id,
    targetType: "workspace_automation",
    targetId: id,
  });
  return NextResponse.json({ deleted: true });
}
