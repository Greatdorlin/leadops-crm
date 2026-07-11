import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import {
  canManageLeadRecord,
  canManageTaskRecord,
} from "@/lib/admin-permissions";
import { leadStore } from "@/lib/storage";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as { completed?: boolean } | null;
  if (!payload?.completed) {
    return NextResponse.json({ error: "Unsupported task update." }, { status: 400 });
  }

  const { taskId } = await params;
  const existingTask = await leadStore.getLeadTaskById(taskId);
  if (!existingTask) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  const lead = await leadStore.getById(existingTask.leadId);
  if (
    !lead ||
    lead.deletedAt ||
    !canManageTaskRecord(
      context.accessLevel,
      existingTask,
      context.session.user?.email,
      context.permissions,
    ) ||
    !canManageLeadRecord(
      context.accessLevel,
      lead,
      context.session.user?.email,
      context.permissions,
    )
  ) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const task = await leadStore.completeLeadTask(taskId, context.session.user?.email ?? null);

  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  return NextResponse.json({ task });
}
